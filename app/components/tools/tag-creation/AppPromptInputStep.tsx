'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, FileDown, Plus, X, Badge } from 'lucide-react'
import type { GeneratedZone, MidWithZones, MediaTemplateRow, Step0Data } from '@/lib/types/tools'
import type { ZoneCsvRow } from '@/lib/utils/csvGenerator'
import { generatedZoneToCsvRow, downloadZoneCsv } from '@/lib/utils/csvGenerator'
import { HelpIcon } from './HelpIcon'

interface AppPromptInputStepProps {
  onComplete: (zones: GeneratedZone[], appId?: string, appstoreUrl?: string, payoutRate?: string) => void
  step0Data?: Step0Data | null // NEW: Data from Step 0
  midWithZones?: MidWithZones[] // NEW: Already added zones
  onAddMidZones?: (mid: string, siteAppName: string, zones: GeneratedZone[], zoneUrl: string, payoutRate: string) => void // Callback with full data
  onRemoveMid?: (mid: string) => void // NEW: Callback when removing a MID
}

export function AppPromptInputStep({
  onComplete,
  step0Data,
  midWithZones = [],
  onAddMidZones,
  onRemoveMid,
}: AppPromptInputStepProps) {
  // Input fields
  const [selectedMid, setSelectedMid] = useState('')
  const [manualMid, setManualMid] = useState('')
  const [zoneUrl, setZoneUrl] = useState('')
  const [prompt, setPrompt] = useState('Create 3 reward zones with FP: 0.4, 0.12, 0.67 respectively - add "_pack 1" at the end of each zone name, and 2 interstitial zones with FP: 0.85, 0.90 - add "_pack 2" at the end')
  const [payoutRate, setPayoutRate] = useState('0.85')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get available MIDs from Step 0 (only those with MID filled)
  const availableMids: MediaTemplateRow[] = step0Data?.medias.filter(m => m.mid?.trim()) || []

  // Auto-fill data when MID is selected
  useEffect(() => {
    if (selectedMid && step0Data?.byMid[selectedMid]) {
      const mediaData = step0Data.byMid[selectedMid]
      setZoneUrl(mediaData.siteUrl || '')
      setManualMid(selectedMid) // Auto-fill MID input
    } else if (!selectedMid) {
      // Clear if no MID selected
      setZoneUrl('')
      // Don't clear manualMid - let user keep typing
    }
  }, [selectedMid, step0Data])

  // Auto-pass payoutRate to parent whenever it changes
  useEffect(() => {
    onComplete([], undefined, undefined, payoutRate)
  }, [payoutRate, onComplete])

  // Extract App ID from URL and auto-fill to Step 3
  const extractAndPassAppId = (url: string) => {
    if (!url.trim()) return

    let appId = ''

    // iOS App Store URL: https://apps.apple.com/.../app/app-name/id123456789
    const iosMatch = url.match(/id(\d+)/)
    if (iosMatch) {
      appId = iosMatch[1]
    }

    // Android Play Store URL: https://play.google.com/store/apps/details?id=com.example.app
    const androidMatch = url.match(/id=([a-zA-Z0-9._]+)/)
    if (androidMatch) {
      appId = androidMatch[1]
    }

    // Pass to Step 3 immediately when URL is detected
    if (appId) {
      onComplete([], appId, url, payoutRate)
    }
  }

  const handleAddZones = async () => {
    // Validation
    if (!manualMid.trim()) {
      setError('Please enter a MID (Media ID)')
      return
    }

    if (!zoneUrl.trim()) {
      setError('Please enter a Zone URL')
      return
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt describing the zones you want to create')
      return
    }

    if (!payoutRate.trim()) {
      setError('Please enter a Payout Rate')
      return
    }

    // Validate payout rate
    const payoutRateNum = parseFloat(payoutRate)
    if (isNaN(payoutRateNum) || payoutRateNum < 0 || payoutRateNum > 1) {
      setError('Payout Rate must be a number between 0 and 1 (e.g., 0.85)')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const response = await fetch('/api/tools/tag-creation/generate-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zoneUrl, prompt, payoutRate: payoutRateNum }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate zones')
      }

      // Get zones from JSON response (actual AI-generated zone names!)
      const data = await response.json()
      const actualZones: GeneratedZone[] = data.zones || []

      if (actualZones.length === 0) {
        throw new Error('No zones generated. Please refine your prompt.')
      }

      console.log('[AppPromptInputStep] Generated zones with AI names:', actualZones.map(z => z['Name of zone']))

      // Get site app name
      const siteAppName = step0Data?.byMid[selectedMid]?.siteAppName || ''

      // Notify parent (will accumulate zones - NO CSV download yet)
      if (onAddMidZones) {
        onAddMidZones(manualMid, siteAppName, actualZones, zoneUrl, payoutRate)
      }

      // Extract App ID from URL and pass to Step 3
      let appId = ''
      const iosMatch = zoneUrl.match(/id(\d+)/)
      if (iosMatch) {
        appId = iosMatch[1]
      }
      const androidMatch = zoneUrl.match(/id=([a-zA-Z0-9._]+)/)
      if (androidMatch) {
        appId = androidMatch[1]
      }

      onComplete([], appId, zoneUrl, payoutRate)

      // Clear inputs for next MID
      setSelectedMid('')
      setZoneUrl('')
      setManualMid('') // Also clear MID input
    } catch (err: any) {
      console.error('Error generating zones:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRemoveMid = (mid: string) => {
    if (onRemoveMid) {
      onRemoveMid(mid)
    }
  }

  const handleGenerateFinalCsv = () => {
    // Generate CSV with ALL zones from ALL MIDs
    const allZones: ZoneCsvRow[] = []

    // For each MID, convert zones to CSV rows
    midWithZones.forEach((item) => {
      const zones = item.zones as GeneratedZone[]
      // Get zoneUrl and payoutRate from the stored data
      // We need to extract this from the zone data or get it from elsewhere
      const zoneUrl = zones[0]?.['Zone URL'] || ''
      const payoutRate = zones[0]?.['Default Payout rate for zone']?.toString() || '0.85'

      // Extract App ID from zone URL
      let appId = ''
      const iosMatch = zoneUrl.match(/id(\d+)/)
      if (iosMatch) {
        appId = iosMatch[1]
      }
      const androidMatch = zoneUrl.match(/id=([a-zA-Z0-9._]+)/)
      if (androidMatch) {
        appId = androidMatch[1]
      }

      zones.forEach((zone) => {
        allZones.push(generatedZoneToCsvRow(zone, item.mid, zoneUrl, appId, payoutRate))
      })
    })

    if (allZones.length === 0) {
      setError('No zones to export. Please add zones first.')
      return
    }

    // Download the CSV
    downloadZoneCsv(allZones, `zones_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.csv`)
  }

  // Get display name for MID
  const getMidDisplayName = (mid: string): string => {
    const mediaData = step0Data?.byMid[mid]
    if (mediaData?.pubname) {
      return `${mid} (${mediaData.pubname})`
    }
    if (mediaData?.siteAppName) {
      return `${mid} (${mediaData.siteAppName})`
    }
    return mid
  }

  // Count total zones
  const totalZones = midWithZones.reduce((sum, m) => sum + (m.zones?.length || 0), 0)

  return (
    <div className="space-y-4" data-step="1">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-[#1565C0]">Step 1: Generate Zones</span>
        <span className="text-sm text-gray-400">(Optional)</span>
      </div>

      <div className="space-y-4">
        {/* MID Selector (if Step 0 data available) */}
        {availableMids.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Select MID <span className="text-gray-500 font-normal">(from Step 0)</span>
            </label>
            <Select value={selectedMid} onValueChange={setSelectedMid}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a MID..." />
              </SelectTrigger>
              <SelectContent>
                {availableMids.map((media) => (
                  <SelectItem key={media.mid} value={media.mid!}>
                    {media.pubname ? `${media.mid} - ${media.pubname}` : `${media.mid} - ${media.siteAppName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* MID Input - Always Visible */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            MID (Media ID) <span className="text-red-500">*</span>
          </label>
          <Input
            value={manualMid}
            onChange={(e) => {
              setManualMid(e.target.value)
              setError(null)
            }}
            placeholder="Enter MID (e.g., 12345)"
          />
          {selectedMid && selectedMid === manualMid && (
            <p className="text-xs text-green-600">Auto-filled from Step 0</p>
          )}
        </div>

        {/* Row 1: Zone URL and Payout Rate */}
        <div className="grid grid-cols-2 gap-4">
          {/* Zone URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Zone URL (App URL) <span className="text-red-500">*</span>
            </label>
            <Input
              value={zoneUrl}
              onChange={(e) => {
                const url = e.target.value
                setZoneUrl(url)
                setError(null)
                extractAndPassAppId(url)
              }}
              placeholder="https://apps.apple.com/app/id6752558926"
              disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.siteUrl}
            />
            {selectedMid && step0Data?.byMid[selectedMid]?.siteUrl && (
              <p className="text-xs text-green-600">Auto-filled from Step 0</p>
            )}
          </div>

          {/* Payout Rate Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Payout Rate <span className="text-red-500">*</span>
            </label>
            <Input
              value={payoutRate}
              onChange={(e) => {
                setPayoutRate(e.target.value)
                setError(null)
              }}
              placeholder="0.85"
              type="text"
            />
            <p className="text-xs text-gray-500">
              Default payout rate for all zones (value between 0 and 1)
            </p>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Zone Configuration <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              setError(null)
            }}
            placeholder='e.g., Create 3 reward zones with FP: 0.4, 0.12, 0.67 respectively - add "_pack 1" at the end of each zone name'
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* Add Zones Button */}
        <Button
          onClick={handleAddZones}
          disabled={isGenerating || !zoneUrl.trim() || !prompt.trim() || !payoutRate.trim()}
          size="lg"
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Zones...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Zones{selectedMid ? ` for ${selectedMid}` : ''}
            </>
          )}
        </Button>

        {/* Added MIDs List */}
        {midWithZones.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700">
              Added MIDs ({midWithZones.length}):
            </p>
            <div className="space-y-2">
              {midWithZones.map((item) => (
                <div key={item.mid} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-gray-800 text-white">
                      {item.mid}
                    </Badge>
                    <span className="text-sm text-gray-700">{item.siteAppName}</span>
                    <span className="text-xs text-gray-500">
                      ({item.zones?.length || 0} zones)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMid(item.mid)}
                    className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {totalZones > 0 && (
              <p className="text-xs text-gray-500">
                Total: {totalZones} zones across {midWithZones.length} MID{midWithZones.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Generate Final CSV Button */}
        {midWithZones.length > 0 && (
          <Button
            onClick={handleGenerateFinalCsv}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Generate & Download CSV (All MIDs)
          </Button>
        )}
      </div>
    </div>
  )
}
