'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Upload, AlertCircle, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExtractedZone, TeamType } from '@/lib/types/tools'
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
}

interface ZoneDataEntryStepProps {
  teamType: TeamType
  zones: ExtractedZone[]
  initialAppstoreUrl?: string
  initialPayoutRate?: string
  onComplete: (zonesWithMetadata: ZoneWithMetadata[]) => void
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
  onComplete,
  onReset,
  onBack
}: ZoneDataEntryStepProps) {
  // Common fields (apply to all zones) - auto-fill from Step 1 if available
  const [appId, setAppId] = useState('') // Team App only
  const [appstoreUrl, setAppstoreUrl] = useState(initialAppstoreUrl)
  const [payoutRate, setPayoutRate] = useState(initialPayoutRate)
  const [pid, setPid] = useState('')
  const [pubname, setPubname] = useState('')
  const [mid, setMid] = useState('')
  const [mediaName, setMediaName] = useState('')
  const [childNetworkCode, setChildNetworkCode] = useState('')
  const [pic, setPic] = useState('')
  const [companyName, setCompanyName] = useState('') // Team Web only
  const [content, setContent] = useState('') // Team App only

  // Individual zone data
  const [zoneData, setZoneData] = useState<ZoneWithMetadata[]>([])

  const [errors, setErrors] = useState<string[]>([])

  // Search filter for zone type dropdown
  const [zoneTypeSearch, setZoneTypeSearch] = useState('')

  // Select the correct zone types based on team type
  const ZONE_TYPES = teamType === 'app' ? ZONE_TYPES_APP : ZONE_TYPES_WEB

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  /**
   * Extract Floor Price (FP) from zone name (Team App only)
   * Expected format: {product}_{fp}_{app_id}_app
   * Example: "reward_0.76_123456_app" → "0.76"
   */
  const extractFPFromZoneName = (zoneName: string): string => {
    try {
      const parts = zoneName.split('_')
      if (parts.length >= 2) {
        const fpCandidate = parts[1]
        // Validate it's a number
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
   * Expected format: {product}_{fp}_{app_id}_app
   * Example: "reward_0.76_123456_app" → "Reward"
   * Example: "banner300x250_0.90_123456_app" → "Banner_300x250"
   * Example: "banner320x50_0.90_123456_app" → "Banner_320x50"
   */
  const detectZoneType = (zoneName: string): string => {
    try {
      const lowerZoneName = zoneName.toLowerCase()

      // Mapping từ zone name prefix đến Zone Type
      // Note: Banner sizes are written WITHOUT underscore (e.g., banner300x250, not banner_300x250)
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

      // Try exact matches first (with underscore after zone type)
      for (const [prefix, zoneType] of Object.entries(zoneTypeMap)) {
        if (lowerZoneName.startsWith(prefix + '_')) {
          return zoneType
        }
      }

      // Fallback: check if it starts with any key (without underscore requirement)
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

          if (teamType === 'app') {
            // Team App: PR + FP + GI act
            const fp = extractFPFromZoneName(zone.zone_name)
            autoFilledNote = `PR: ${payoutRate || ''}\nFP: ${fp}\nGI act `

            // Auto-detect zone type from zone name
            detectedZoneType = detectZoneType(zone.zone_name)

            console.log(`[ZoneDataEntryStep] Team App - Zone: ${zone.zone_name} → FP: ${fp}, Type: ${detectedZoneType}`)
          } else {
            // Team Web: only PR
            autoFilledNote = `PR: ${payoutRate || ''}`
            console.log(`[ZoneDataEntryStep] Team Web - Zone: ${zone.zone_name}`)
          }

          return {
            ...zone,
            zone_type: detectedZoneType,
            cs_sales_note_type: autoFilledNote,
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

          if (teamType === 'app') {
            // Team App: PR + FP + GI act
            const fp = extractFPFromZoneName(zone.zone_name)
            autoFilledNote = `PR: ${payoutRate || ''}\nFP: ${fp}\nGI act `

            // Re-detect zone type if it's empty
            if (!updatedZoneType) {
              updatedZoneType = detectZoneType(zone.zone_name)
            }
          } else {
            // Team Web: only PR
            autoFilledNote = `PR: ${payoutRate || ''}`
          }

          return {
            ...zone,
            zone_type: updatedZoneType,
            cs_sales_note_type: autoFilledNote,
          }
        })
      )
    }
  }, [payoutRate, teamType])

  // Auto-extract App ID from Appstore URL (Team App only)
  useEffect(() => {
    if (teamType !== 'app') return

    if (!appstoreUrl.trim()) {
      setAppId('')
      return
    }

    let extractedAppId = ''

    // iOS App Store URL: https://apps.apple.com/.../app/app-name/id123456789
    const iosMatch = appstoreUrl.match(/id(\d+)/)
    if (iosMatch) {
      extractedAppId = iosMatch[1]
    }

    // Android Play Store URL: https://play.google.com/store/apps/details?id=com.example.app
    const androidMatch = appstoreUrl.match(/id=([a-zA-Z0-9._]+)/)
    if (androidMatch) {
      extractedAppId = androidMatch[1]
    }

    setAppId(extractedAppId)
  }, [appstoreUrl, teamType])

  const validateAndSync = async () => {
    const validationErrors: string[] = []

    // Validate common fields (different for Team App vs Team Web)
    if (teamType === 'app') {
      // Team App validation
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
      // Team Web validation
      if (!appstoreUrl.trim()) validationErrors.push('Domain is required')
      if (!pid.trim()) validationErrors.push('PID is required')
      if (!pubname.trim()) validationErrors.push('Publisher Name is required')
      if (!mid.trim()) validationErrors.push('MID is required')
      if (!mediaName.trim()) validationErrors.push('Media Name is required')
      if (!pic.trim()) validationErrors.push('PIC is required')
      if (!companyName.trim()) validationErrors.push('Company Name is required')
      // GAM Network ID is optional for Team Web
    }

    // Validate individual zone fields
    zoneData.forEach((zone, index) => {
      if (!zone.zone_type) {
        validationErrors.push(`Zone ${index + 1}: Zone Type is required`)
      }
      if (!zone.cs_sales_note_type?.trim()) {
        validationErrors.push(`Zone ${index + 1}: CS/Sales Note is required`)
      }
    })

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    // Merge common fields into all zones (team-specific)
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
          child_network_code: childNetworkCode, // optional for web
          company_name: companyName,
        }
      }
    })

    // Sync to Google Sheets - dynamic sheet name based on team type
    const sheetName = teamType === 'app' ? 'Tag Creation_APP' : 'Tag Creation_WEB'
    const sheetGid = teamType === 'app' ? '193855895' : '101229294'

    setIsSyncing(true)
    setSyncError(null)
    setSyncSuccess(false)

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
    } catch (err: any) {
      console.error('Error syncing to sheets:', err)
      setSyncError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            3
          </div>
          <div className="flex items-center">
            <CardTitle className="text-base text-[#1565C0]">Enter Zone Metadata</CardTitle>
            <HelpIcon
              title="What to fill in"
              content={teamType === 'app' ? `1. Common Information (applies to all zones):
   - App ID: Auto-extracted from Zone URL (read-only)
   - Zone URL: URL to app store listing (iOS or Android)
   - PIC: Person In Charge
   - PID: Publisher ID
   - Publisher Name: Name of the publisher
   - Child Network Code: Ad network code
   - MID: Media ID
   - Media Name: Name of the media property
   - Content: Game or Non-game

2. Individual Zone Information (for each zone):
   - Zone Type: AppOpen, Banner types, Interstitial, Native, Reward, Video types, etc.
   - CS/Sales Note: Enter custom text (e.g., CS, Sales, or any note)` : `1. Common Information (applies to all zones):
   - Domain: Website domain
   - PIC: Person In Charge
   - PID: Publisher ID
   - Publisher Name: Name of the publisher
   - Company Name: Child pub name
   - GAM Network ID: Ad network code (optional)
   - MID: Media ID
   - Media Name: Name of the media property

2. Individual Zone Information (for each zone):
   - Zone Type: Banner, Inpage, VAST, etc.
   - CS/Sales Note: Enter custom text (e.g., CS, Sales, or any note)`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common Fields Section - Conditional based on team type */}
        <div className="space-y-4">
          {teamType === 'app' ? (
            // Team App: 3 rows x 3 columns
            <>
              {/* Row 1: App ID, Zone URL, PIC */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    App ID <span className="text-xs text-gray-500 font-normal">(Auto)</span>
                  </label>
                  <Input
                    value={appId}
                    disabled
                    placeholder="Auto-filled"
                    className="h-8 text-xs bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Zone URL <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={appstoreUrl}
                    onChange={(e) => {
                      setAppstoreUrl(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    PIC <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pic}
                    onChange={(e) => {
                      setPic(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Row 2: PID, Publisher Name, Child Network Code */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    PID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pid}
                    onChange={(e) => {
                      setPid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Publisher Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pubname}
                    onChange={(e) => {
                      setPubname(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Child Network Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={childNetworkCode}
                    onChange={(e) => {
                      setChildNetworkCode(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Row 3: MID, Media Name, Content */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    MID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={mid}
                    onChange={(e) => {
                      setMid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Media Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={mediaName}
                    onChange={(e) => {
                      setMediaName(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <Select value={content} onValueChange={(value) => {
                    setContent(value)
                    if (errors.length > 0) setErrors([])
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {CONTENT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            // Team Web: 2 rows x 4 columns
            <>
              {/* Row 1: Domain, PIC, PID, Publisher Name */}
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Domain <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={appstoreUrl}
                    onChange={(e) => {
                      setAppstoreUrl(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    PIC <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pic}
                    onChange={(e) => {
                      setPic(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    PID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pid}
                    onChange={(e) => {
                      setPid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Publisher Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pubname}
                    onChange={(e) => {
                      setPubname(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Company Name, GAM Network ID, MID, Media Name */}
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    placeholder="Child pub name"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    GAM Network ID
                  </label>
                  <Input
                    value={childNetworkCode}
                    onChange={(e) => {
                      setChildNetworkCode(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    MID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={mid}
                    onChange={(e) => {
                      setMid(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 block">
                    Media Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={mediaName}
                    onChange={(e) => {
                      setMediaName(e.target.value)
                      if (errors.length > 0) setErrors([])
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Individual Zone Data Table */}
        <div className="space-y-3 pt-2">
          <div className="rounded-lg overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">#</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Zone ID</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Zone Name</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">Zone Type *</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">CS/Sales Note *</th>
                </tr>
              </thead>
              <tbody>
                {zoneData.map((zone, index) => (
                  <tr key={index} className="even:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{zone.zone_id}</td>
                    <td className="px-3 py-2 text-xs max-w-xs truncate" title={zone.zone_name}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-2">
                  Please fix the following errors:
                </h4>
                <ul className="text-xs text-red-700 space-y-1">
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

        {/* Sync Error */}
        {syncError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-1">
                  Sync Failed
                </h4>
                <p className="text-xs text-red-700">{syncError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sync Success Message */}
        {syncSuccess && (() => {
          const sheetName = teamType === 'app' ? 'Tag Creation_APP' : 'Tag Creation_WEB'
          const sheetGid = teamType === 'app' ? '193855895' : '101229294'
          const sheetUrl = `https://docs.google.com/spreadsheets/d/1gfCTHCfpTqhb6pzpEhkYx3RxvMhOlhB4pB2iUlSWBNs/edit?gid=${sheetGid}#gid=${sheetGid}`

          return (
            <div className="rounded-lg border border-[#1565C0]/20 bg-[#E3F2FD] p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#1565C0] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-[#0D47A1] mb-2">
                    Successfully Synced to Google Sheets!
                  </h4>
                  <p className="text-xs text-[#1565C0] mb-2">
                    Data has been written to: <span className="font-medium">{sheetName}</span>
                  </p>
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#1565C0] hover:text-[#0D47A1] hover:underline"
                  >
                    View in Google Sheets
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Sync Button or Create New Tag */}
        <div className="flex justify-end pt-4">
          {syncSuccess ? (
            <Button
              onClick={onReset}
              size="lg"
              className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white"
            >
              Create New Tag
            </Button>
          ) : (
            <Button
              onClick={validateAndSync}
              size="lg"
              className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white"
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing to Google Sheets...
                </>
              ) : (
                <>
                  Sync to Google Sheets
                  <Upload className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
