'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Upload, AlertCircle, Loader2, CheckCircle2, ExternalLink, Badge } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExtractedZone, TeamType, Step0Data, MidSyncStatus, MediaTemplateRow } from '@/lib/types/tools'
import { HelpIcon } from './HelpIcon'

interface ZoneWithMetadata extends ExtractedZone {
  // Common fields (same for all zones)
  app_id?: string // Team App only
  appstore_url?: string
  pid?: string
  pubname?: string
  mid?: string
  media_name?: string
  child_network_code?: string
  pic?: string
  company_name?: string // Team Web only
  content?: string // Team App only

  // Individual zone fields
  zone_type?: string
  cs_sales_note_type?: string
  // account field already in ExtractedZone (inherited)
}

interface ZoneDataEntryStepProps {
  teamType: TeamType
  zones: ExtractedZone[]
  initialAppstoreUrl?: string
  initialPayoutRate?: string
  step0Data?: Step0Data | null // NEW: Data from Step 0
  syncedMids?: Set<string> // NEW: Already synced MIDs
  onComplete: (zonesWithMetadata: ZoneWithMetadata[]) => void
  onSyncMid?: (mid: string, data: ZoneWithMetadata[]) => void // NEW: Callback when syncing a MID
  onReset: () => void
  onBack: () => void
}

// Hard coded options (based on actual usage)
const ZONE_TYPES_APP = [
  'AppOpen',
  'Banner_adaptive',
  'Banner_allsize',
  'Banner_320x50',
  'Banner_300x250',
  'Banner_custom',
  'Interstitial',
  'Native',
  'Reward',
  'Video_instream',
  'Video_CTV',
  'Reward Interstitial',
]

const ZONE_TYPES_WEB = [
  'Banner',
  '300x600',
  'Inpage',
  'Overlay',
  'Interstitial',
  'Offerwall',
  'VAST',
  'WipeAd',
  '728x90',
  '970x250',
  'Tower',
  'Reward Video',
  'In-image',
  'Under-image',
  'Flexible sticky',
]

const CONTENT_OPTIONS = ['Game', 'Non-game']

export function ZoneDataEntryStep({
  teamType,
  zones,
  initialAppstoreUrl = '',
  initialPayoutRate = '',
  step0Data,
  syncedMids = new Set(),
  onComplete,
  onSyncMid,
  onReset,
  onBack
}: ZoneDataEntryStepProps) {
  // Available MIDs from Step 0 (for multi-MID sync)
  const availableMids: MediaTemplateRow[] = step0Data?.medias.filter(m => m.mid?.trim()) || []

  // Selected MID for sync
  const [selectedMid, setSelectedMid] = useState('')

  // Common fields (apply to all zones) - auto-fill from Step 1 if available
  const [appId, setAppId] = useState('')
  const [appstoreUrl, setAppstoreUrl] = useState(initialAppstoreUrl)
  const [payoutRate, setPayoutRate] = useState(initialPayoutRate)
  const [pid, setPid] = useState('')
  const [pubname, setPubname] = useState('')
  const [mid, setMid] = useState('')
  const [mediaName, setMediaName] = useState('')
  const [childNetworkCode, setChildNetworkCode] = useState('')
  const [pic, setPic] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [content, setContent] = useState('')

  // Individual zone data
  const [zoneData, setZoneData] = useState<ZoneWithMetadata[]>([])

  const [errors, setErrors] = useState<string[]>([])
  const [zoneTypeSearch, setZoneTypeSearch] = useState('')

  // Sync state - PER MID
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentSyncingMid, setCurrentSyncingMid] = useState<string | null>(null)
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({})
  const [syncSuccess, setSyncSuccess] = useState(false)

  const ZONE_TYPES = teamType === 'app' ? ZONE_TYPES_APP : ZONE_TYPES_WEB

  /**
   * Auto-fill data when MID is selected
   */
  useEffect(() => {
    if (selectedMid && step0Data?.byMid[selectedMid]) {
      const mediaData = step0Data.byMid[selectedMid]
      setPid(mediaData.pid || '')
      setPubname(mediaData.pubname || '')
      setMid(selectedMid)
      setMediaName(mediaData.siteAppName || '')
      setAppstoreUrl(mediaData.siteUrl || '')
      // Auto-fill common fields from Step 0 (childNetworkCode, pic)
      setChildNetworkCode(step0Data.childNetworkCode || '')
      setPic(step0Data.pic || '')
      // Clear errors when data is auto-filled
      if (errors.length > 0) setErrors([])
    } else if (!selectedMid) {
      // Clear if no MID selected
      setPid('')
      setPubname('')
      setMid('')
      setMediaName('')
      setAppstoreUrl('')
      setChildNetworkCode('')
      setPic('')
    }
    // Clear errors when data is auto-filled (intentionally not tracking errors)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMid, step0Data])

  /**
   * Extract Floor Price (FP) from zone name (Team App only)
   */
  const extractFPFromZoneName = (zoneName: string): string => {
    try {
      const parts = zoneName.split('_')
      if (parts.length >= 2) {
        const fpCandidate = parts[1]
        if (!isNaN(parseFloat(fpCandidate))) {
          return fpCandidate
        }
      }
      return ''
    } catch (error) {
      console.error('Error extracting FP from zone name:', error)
      return ''
    }
  }

  /**
   * Auto-detect Zone Type from zone name (Team App only)
   */
  const detectZoneType = (zoneName: string): string => {
    try {
      const lowerZoneName = zoneName.toLowerCase()
      const zoneTypeMap: Record<string, string> = {
        'appopen': 'AppOpen',
        'banneradaptive': 'Banner_adaptive',
        'banner_adaptive': 'Banner_adaptive',
        'bannerallsize': 'Banner_allsize',
        'banner_allsize': 'Banner_allsize',
        'banner320x50': 'Banner_320x50',
        'banner300x250': 'Banner_300x250',
        'bannercustom': 'Banner_custom',
        'banner_custom': 'Banner_custom',
        'interstitial': 'Interstitial',
        'native': 'Native',
        'reward': 'Reward',
        'videoinstream': 'Video_instream',
        'video_instream': 'Video_instream',
        'videoctv': 'Video_CTV',
        'video_ctv': 'Video_CTV',
        'rewardinterstitial': 'Reward Interstitial',
        'reward_interstitial': 'Reward Interstitial',
      }

      for (const [prefix, zoneType] of Object.entries(zoneTypeMap)) {
        if (lowerZoneName.startsWith(prefix + '_')) {
          return zoneType
        }
      }

      for (const [prefix, zoneType] of Object.entries(zoneTypeMap)) {
        if (lowerZoneName.startsWith(prefix)) {
          return zoneType
        }
      }

      return ''
    } catch (error) {
      console.error('Error detecting zone type from zone name:', error)
      return ''
    }
  }

  // Update zoneData when zones prop changes from Step 2
  useEffect(() => {
    if (zones && zones.length > 0) {
      console.log('[ZoneDataEntryStep] Auto-filling notes with PR:', payoutRate)
      setZoneData(
        zones.map((zone) => {
          let autoFilledNote = ''
          let detectedZoneType = ''
          let extractedFP = ''

          if (teamType === 'app') {
            extractedFP = extractFPFromZoneName(zone.zone_name)
            autoFilledNote = `PR: ${payoutRate || ''}\nFP: ${extractedFP}\nGI act `
            detectedZoneType = detectZoneType(zone.zone_name)
            console.log(`[ZoneDataEntryStep] Team App - Zone: ${zone.zone_name} → FP: ${extractedFP}, Type: ${detectedZoneType}`)
          } else {
            autoFilledNote = `PR: ${payoutRate || ''}`
            console.log(`[ZoneDataEntryStep] Team Web - Zone: ${zone.zone_name}`)
          }

          return {
            ...zone,
            zone_type: detectedZoneType,
            cs_sales_note_type: autoFilledNote,
            payout_rate: teamType === 'app' ? payoutRate : undefined,
            floor_price: teamType === 'app' ? extractedFP : undefined,
            account: teamType === 'app' ? 'GI' : undefined,
          }
        })
      )
    }
  }, [zones, payoutRate, teamType])

  const handleZoneFieldChange = (
    index: number,
    field: keyof ZoneWithMetadata,
    value: string
  ) => {
    const updated = [...zoneData]
    updated[index] = { ...updated[index], [field]: value }
    setZoneData(updated)
    if (errors.length > 0) setErrors([])
    // Clear sync error when user makes changes
    if (selectedMid && syncErrors[selectedMid]) {
      setSyncErrors(prev => {
        const updated = { ...prev }
        delete updated[selectedMid]
        return updated
      })
    }
  }

  // Update state when initial values change from Step 1
  useEffect(() => {
    console.log('[ZoneDataEntryStep] Props from Step 1:', {
      initialAppstoreUrl,
      initialPayoutRate
    })
    if (initialAppstoreUrl) {
      setAppstoreUrl(initialAppstoreUrl)
    }
    if (initialPayoutRate) {
      setPayoutRate(initialPayoutRate)
    }
  }, [initialAppstoreUrl, initialPayoutRate])

  // Update all zone notes when payoutRate changes
  useEffect(() => {
    if (zoneData.length > 0) {
      setZoneData(prevZoneData =>
        prevZoneData.map(zone => {
          let autoFilledNote = ''
          let updatedZoneType = zone.zone_type
          let extractedFP = ''

          if (teamType === 'app') {
            extractedFP = extractFPFromZoneName(zone.zone_name)
            autoFilledNote = `PR: ${payoutRate || ''}\nFP: ${extractedFP}\nGI act `
            if (!updatedZoneType) {
              updatedZoneType = detectZoneType(zone.zone_name)
            }
          } else {
            autoFilledNote = `PR: ${payoutRate || ''}`
          }

          return {
            ...zone,
            zone_type: updatedZoneType,
            cs_sales_note_type: autoFilledNote,
            payout_rate: teamType === 'app' ? payoutRate : zone.payout_rate,
            floor_price: teamType === 'app' ? extractedFP : zone.floor_price,
            account: zone.account || (teamType === 'app' ? 'GI' : undefined),
          }
        })
      )
    }
    // Intentionally not tracking zoneData to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutRate, teamType])

  // Auto-extract App ID from Appstore URL (Team App only)
  useEffect(() => {
    if (teamType !== 'app') return

    if (!appstoreUrl.trim()) {
      setAppId('')
      return
    }

    let extractedAppId = ''
    const iosMatch = appstoreUrl.match(/id(\d+)/)
    if (iosMatch) {
      extractedAppId = iosMatch[1]
    }

    const androidMatch = appstoreUrl.match(/id=([a-zA-Z0-9._]+)/)
    if (androidMatch) {
      extractedAppId = androidMatch[1]
    }

    setAppId(extractedAppId)
  }, [appstoreUrl, teamType])

  /**
   * Validate and sync zones for selected MID
   * NO PAGE REFRESH after sync
   */
  const validateAndSync = async () => {
    const validationErrors: string[] = []

    // Validate common fields
    if (teamType === 'app') {
      if (!appId.trim()) validationErrors.push('App ID is required')
      if (!appstoreUrl.trim()) validationErrors.push('Zone URL is required')
      if (!pid.trim()) validationErrors.push('PID is required')
      if (!pubname.trim()) validationErrors.push('Publisher Name is required')
      if (!mid.trim()) validationErrors.push('MID is required')
      if (!mediaName.trim()) validationErrors.push('Media Name is required')
      if (!childNetworkCode.trim()) validationErrors.push('Child Network Code is required')
      if (!pic.trim()) validationErrors.push('PIC is required')
      if (!content.trim()) validationErrors.push('Content is required')
    } else {
      if (!appstoreUrl.trim()) validationErrors.push('Domain is required')
      if (!pid.trim()) validationErrors.push('PID is required')
      if (!pubname.trim()) validationErrors.push('Publisher Name is required')
      if (!mid.trim()) validationErrors.push('MID is required')
      if (!mediaName.trim()) validationErrors.push('Media Name is required')
      if (!pic.trim()) validationErrors.push('PIC is required')
      if (!companyName.trim()) validationErrors.push('Company Name is required')
    }

    // Validate individual zone fields
    zoneData.forEach((zone, index) => {
      if (!zone.zone_type) {
        validationErrors.push(`Zone ${index + 1}: Zone Type is required`)
      }
      if (!zone.cs_sales_note_type?.trim()) {
        validationErrors.push(`Zone ${index + 1}: CS/Sales Note is required`)
      }
      if (teamType === 'app' && !zone.account?.trim()) {
        validationErrors.push(`Zone ${index + 1}: Account is required`)
      }
    })

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    // Merge common fields into all zones
    const finalData = zoneData.map((zone) => {
      const baseData = {
        ...zone,
        appstore_url: appstoreUrl,
        pid,
        pubname,
        mid,
        media_name: mediaName,
        pic,
      }

      if (teamType === 'app') {
        return {
          ...baseData,
          app_id: appId,
          child_network_code: childNetworkCode,
          content,
        }
      } else {
        return {
          ...baseData,
          child_network_code: childNetworkCode,
          company_name: companyName,
        }
      }
    })

    const sheetName = teamType === 'app' ? 'Tag Creation_APP' : 'Tag Creation_WEB'
    const sheetGid = teamType === 'app' ? '193855895' : '101229294'

    setIsSyncing(true)
    setCurrentSyncingMid(mid)
    setSyncErrors(prev => {
      const updated = { ...prev }
      delete updated[mid || '']
      return updated
    })

    try {
      const response = await fetch('/api/tools/tag-creation/sync-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zones: finalData,
          spreadsheetId: '1gfCTHCfpTqhb6pzpEhkYx3RxvMhOlhB4pB2iUlSWBNs',
          sheetName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync to Google Sheets')
      }

      setSyncSuccess(true)
      onComplete(finalData)

      // Notify parent about MID sync
      if (onSyncMid && mid) {
        onSyncMid(mid, finalData)
      }

      // NO PAGE REFRESH - allow user to sync another MID
      // Clear selected MID for next sync
      setTimeout(() => {
        setSelectedMid('')
      }, 500)
    } catch (err: any) {
      console.error('Error syncing to sheets:', err)
      const errorMsg = err.message
      setSyncErrors(prev => ({ ...prev, [mid || '']: errorMsg }))
    } finally {
      setIsSyncing(false)
      setCurrentSyncingMid(null)
    }
  }

  // Get sync status for a MID
  const getMidSyncStatus = (mid: string): MidSyncStatus['status'] => {
    if (currentSyncingMid === mid) return 'syncing'
    if (syncErrors[mid]) return 'error'
    if (syncedMids.has(mid)) return 'synced'
    return 'pending'
  }

  const sheetName = teamType === 'app' ? 'Tag Creation_APP' : 'Tag Creation_WEB'
  const sheetGid = teamType === 'app' ? '193855895' : '101229294'
  const sheetUrl = `https://docs.google.com/spreadsheets/d/1gfCTHCfpTqhb6pzpEhkYx3RxvMhOlhB4pB2iUlSWBNs/edit?gid=${sheetGid}#gid=${sheetGid}`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-[#1565C0]">Step 3: Sync to Sheets</span>
      </div>

      <div className="space-y-4">
        {/* MID Selector (if Step 0 data available) */}
        {availableMids.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Select MID to sync <span className="text-gray-500 font-normal">(from Step 0)</span>
            </label>
            <Select value={selectedMid} onValueChange={setSelectedMid}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a MID to sync..." />
              </SelectTrigger>
              <SelectContent>
                {availableMids.map((media) => (
                  <SelectItem key={media.mid} value={media.mid!}>
                    <div className="flex items-center gap-2">
                      <span>{media.mid}</span>
                      {media.pubname && <span className="text-gray-500">({media.pubname})</span>}
                      {syncedMids.has(media.mid!) && (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sync Status Summary */}
        {availableMids.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableMids.map((media) => {
              const status = getMidSyncStatus(media.mid!)
              return (
                <Badge
                  key={media.mid}
                  variant="secondary"
                  className={
                    status === 'synced'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : status === 'syncing'
                        ? 'bg-blue-600 text-white'
                        : status === 'error'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                  }
                >
                  {media.mid}
                  {status === 'synced' && ' ✓'}
                  {status === 'syncing' && ' ...'}
                  {status === 'error' && ' ✗'}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Common Fields Section */}
        <div className="space-y-4">
          {teamType === 'app' ? (
            <>
              {/* Row 1: App ID, Zone URL */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    App ID <span className="text-xs text-gray-400">(Auto)</span>
                  </label>
                  <Input
                    value={appId}
                    disabled
                    placeholder="Auto-filled"
                    className="h-9 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Zone URL <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.siteUrl && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={appstoreUrl}
                    onChange={(e) => {
                      setAppstoreUrl(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.siteUrl}
                  />
                </div>
              </div>

              {/* Row 2: PID, Publisher Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    PID <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.pid && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={pid}
                    onChange={(e) => {
                      setPid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.pid}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Publisher Name <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.pubname && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={pubname}
                    onChange={(e) => {
                      setPubname(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.pubname}
                  />
                </div>
              </div>

              {/* Row 3: MID, Media Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    MID <span className="text-red-500">*</span>
                    {selectedMid && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={mid}
                    onChange={(e) => {
                      setMid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Media Name <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.siteAppName && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={mediaName}
                    onChange={(e) => {
                      setMediaName(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.siteAppName}
                  />
                </div>
              </div>

              {/* Row 4: Child Network Code, PIC, Content */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Child Network Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={childNetworkCode}
                    onChange={(e) => {
                      setChildNetworkCode(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    PIC <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pic}
                    onChange={(e) => {
                      setPic(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <Select value={content} onValueChange={(value) => {
                    setContent(value)
                    if (errors.length > 0) setErrors([])
                  }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {CONTENT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Row 1: Domain, PIC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Domain <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.siteUrl && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={appstoreUrl}
                    onChange={(e) => {
                      setAppstoreUrl(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.siteUrl}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    PIC <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pic}
                    onChange={(e) => {
                      setPic(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Row 2: PID, Publisher Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    PID <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.pid && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={pid}
                    onChange={(e) => {
                      setPid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.pid}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Publisher Name <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.pubname && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={pubname}
                    onChange={(e) => {
                      setPubname(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.pubname}
                  />
                </div>
              </div>

              {/* Row 3: Company Name, Child Network Code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    placeholder="Child pub name"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Child Network Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={childNetworkCode}
                    onChange={(e) => {
                      setChildNetworkCode(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Row 4: MID, Media Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    MID <span className="text-red-500">*</span>
                    {selectedMid && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={mid}
                    onChange={(e) => {
                      setMid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 block">
                    Media Name <span className="text-red-500">*</span>
                    {selectedMid && step0Data?.byMid[selectedMid]?.siteAppName && (
                      <span className="text-xs text-green-600 ml-1">(Auto)</span>
                    )}
                  </label>
                  <Input
                    value={mediaName}
                    onChange={(e) => {
                      setMediaName(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-9 text-sm"
                    disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.siteAppName}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="rounded-lg overflow-auto max-h-96 bg-white border">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">#</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Zone ID</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Zone Name</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Zone Type *</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">CS/Sales Note *</th>
                  {teamType === 'app' && (
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">Account *</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {zoneData.map((zone, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-3 py-2 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-sm text-gray-900">{zone.zone_id}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={zone.zone_name}>
                      {zone.zone_name}
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={zone.zone_type}
                        onValueChange={(value) => {
                          handleZoneFieldChange(index, 'zone_type', value)
                          setZoneTypeSearch('')
                        }}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="max-h-[220px]">
                          <div className="px-2 pb-2 pt-1 sticky top-0 bg-white border-b">
                            <Input
                              placeholder="Search..."
                              value={zoneTypeSearch}
                              onChange={(e) => setZoneTypeSearch(e.target.value)}
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="max-h-[160px] overflow-y-auto">
                            {ZONE_TYPES.filter((type) =>
                              type.toLowerCase().includes(zoneTypeSearch.toLowerCase())
                            ).map((type) => (
                              <SelectItem key={type} value={type} className="text-xs">
                                {type}
                              </SelectItem>
                            ))}
                            {ZONE_TYPES.filter((type) =>
                              type.toLowerCase().includes(zoneTypeSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="px-2 py-4 text-xs text-gray-500 text-center">
                                No results found
                              </div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        value={zone.cs_sales_note_type || ''}
                        onChange={(e) =>
                          handleZoneFieldChange(index, 'cs_sales_note_type', e.target.value)
                        }
                        placeholder="Enter note..."
                        className="min-h-[50px] w-48 resize-y !text-xs leading-tight"
                        rows={2}
                      />
                    </td>
                    {teamType === 'app' && (
                      <td className="px-3 py-2">
                        <Select
                          value={zone.account || 'GI'}
                          onValueChange={(value) => handleZoneFieldChange(index, 'account', value)}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue placeholder="GI" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="zone-gi" value="GI" className="text-xs">GI</SelectItem>
                            <SelectItem key="zone-gj" value="GJ" className="text-xs">GJ</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-2">
                  Please fix the following errors:
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-red-500">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {selectedMid && syncErrors[selectedMid] && (
          <div className="border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-1">
                  Sync Failed for MID: {selectedMid}
                </h4>
                <p className="text-sm text-red-700">{syncErrors[selectedMid]}</p>
              </div>
            </div>
          </div>
        )}

        {syncSuccess && selectedMid && (
          <div className="border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Successfully Synced MID: {selectedMid}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Data has been written to: <span className="font-medium">{sheetName}</span>
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:underline"
                  >
                    View in Google Sheets
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <p className="text-sm text-gray-600">
                    Select another MID to continue syncing
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button
            onClick={validateAndSync}
            size="lg"
            className={`w-full ${syncSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
            disabled={isSyncing || zoneData.length === 0}
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing {selectedMid ? `MID ${selectedMid}` : 'to Google Sheets'}...
              </>
            ) : syncSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sync Complete - Select Another MID
              </>
            ) : (
              <>
                Sync {selectedMid ? `MID ${selectedMid}` : 'to Google Sheets'}
                <Upload className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* All Synced Message */}
        {availableMids.length > 0 && syncedMids.size === availableMids.length && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900">
              All MIDs synced successfully!
            </p>
            <Button
              onClick={onReset}
              variant="outline"
              className="mt-3 border-green-600 text-green-700 hover:bg-green-100"
            >
              Create New Workflow
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
