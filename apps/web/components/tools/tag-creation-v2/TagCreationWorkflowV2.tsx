'use client'

import { useState, useCallback, useEffect } from 'react'
import { AppPromptInputStep } from '@/components/tools/tag-creation/AppPromptInputStep'
import { WebPromptInputStep } from '@/components/tools/tag-creation/WebPromptInputStep'
import { ZoneDataEntryStep } from '@/components/tools/tag-creation/ZoneDataEntryStep'
import { MediaPreparationStep } from '@/components/tools/tag-creation/MediaPreparationStep'
import { CSVUploadStep } from './CSVUploadStep'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Smartphone, Globe } from 'lucide-react'
import type { GeneratedZone, ExtractedZone, TeamType, MidWithZones, MediaTemplateRow, Step0Data } from '@query-stream-ai/types/tools'

interface CSVUploadResult {
  zones: ExtractedZone[]
  publisherId: string
  mediaId: string
  mediaName: string
  count: number
}

export function TagCreationWorkflowV2() {
  const [teamType, setTeamType] = useState<TeamType>('app')
  const [generatedZones, setGeneratedZones] = useState<GeneratedZone[]>([])
  const [extractedZones, setExtractedZones] = useState<ExtractedZone[]>([])

  // CSV upload result (contains publisherId for PID auto-fill)
  const [csvResult, setCsvResult] = useState<CSVUploadResult | null>(null)

  // Step 0: Media Preparation data
  const [mediaRows, setMediaRows] = useState<MediaTemplateRow[]>([])
  const [step0Data, setStep0Data] = useState<Step0Data | null>(null)

  // Step 1: Multi-MID support
  const [midWithZones, setMidWithZones] = useState<MidWithZones[]>([])

  // Step 3: Multi-MID sync tracking
  const [syncedMids, setSyncedMids] = useState<Set<string>>(new Set())

  // Reset counter to force component re-mount on reset
  const [resetCounter, setResetCounter] = useState(0)

  // Store App ID, Appstore URL, and Payout Rate from Step 1
  const [appIdFromStep1, setAppIdFromStep1] = useState<string>('')
  const [appstoreUrlFromStep1, setAppstoreUrlFromStep1] = useState<string>('')
  const [payoutRateFromStep1, setPayoutRateFromStep1] = useState<string>('')

  // Create Step0Data from mediaRows
  useEffect(() => {
    if (mediaRows.length > 0) {
      const byMid: Record<string, MediaTemplateRow> = {}
      // Get common fields (childNetworkCode, pic) from first row
      const childNetworkCode = mediaRows[0]?.childNetworkCode
      const pic = mediaRows[0]?.pic
      mediaRows.forEach(row => {
        if (row.mid) {
          byMid[row.mid] = row
        }
      })
      setStep0Data({
        medias: mediaRows,
        byMid,
        childNetworkCode,
        pic
      })
    } else {
      setStep0Data(null)
    }
  }, [mediaRows])

  console.log('[TagCreationWorkflowV2] Render:', {
    teamType,
    extractedZonesCount: extractedZones.length,
    appIdFromStep1,
    payoutRateFromStep1,
    step0Data,
    csvResult,
    midWithZones,
    syncedMids: Array.from(syncedMids)
  })

  // Reset entire workflow to start fresh - NO PAGE REFRESH
  const handleReset = useCallback(() => {
    setGeneratedZones([])
    setExtractedZones([])
    setCsvResult(null)
    setMediaRows([])
    setStep0Data(null)
    setMidWithZones([])
    setSyncedMids(new Set())
    setAppIdFromStep1('')
    setAppstoreUrlFromStep1('')
    setPayoutRateFromStep1('')
    // Increment reset counter to force all child components to re-mount
    setResetCounter(prev => prev + 1)
  }, [])

  // Handle team type change with confirmation if data exists
  const handleTeamTypeChange = useCallback((newTeamType: TeamType) => {
    const hasData = extractedZones.length > 0 || appIdFromStep1 || appstoreUrlFromStep1 || midWithZones.length > 0 || csvResult

    if (hasData) {
      const confirmed = window.confirm(
        'Switching team type will reset all entered data. Are you sure you want to continue?'
      )
      if (!confirmed) return

      handleReset()
    }

    setTeamType(newTeamType)
  }, [extractedZones.length, appIdFromStep1, appstoreUrlFromStep1, midWithZones.length, csvResult, handleReset])

  // Step 0 callback handler
  const handleStep0Complete = useCallback((data: MediaTemplateRow[], childNetworkCode?: string, pic?: string) => {
    console.log('[TagCreationWorkflowV2] Step 0 complete:', data, childNetworkCode, pic)
    // Add common fields to all rows
    const dataWithCommonFields = data.map(row => ({
      ...row,
      childNetworkCode: childNetworkCode || row.childNetworkCode,
      pic: pic || row.pic
    }))
    setMediaRows(dataWithCommonFields)
  }, [])

  // Step 1 callback handlers with multi-MID support
  const handleAppStepComplete = useCallback((zones: GeneratedZone[], appId?: string, appstoreUrl?: string, payoutRate?: string) => {
    if (zones.length > 0) {
      setGeneratedZones(zones)
    }
    if (appId) setAppIdFromStep1(appId)
    if (appstoreUrl) setAppstoreUrlFromStep1(appstoreUrl)
    if (payoutRate) setPayoutRateFromStep1(payoutRate)
  }, [])

  const handleWebStepComplete = useCallback((zones: ExtractedZone[], appId?: string, appstoreUrl?: string, payoutRate?: string) => {
    if (zones.length > 0) {
      setExtractedZones(zones)
    }
    if (appId) setAppIdFromStep1(appId)
    if (appstoreUrl) setAppstoreUrlFromStep1(appstoreUrl)
    if (payoutRate) setPayoutRateFromStep1(payoutRate)
  }, [])

  // Step 1: Add zones for a MID
  const handleAddMidZones = useCallback((mid: string, siteAppName: string, zones: GeneratedZone[] | ExtractedZone[], zoneUrl?: string, payoutRate?: string) => {
    console.log('[TagCreationWorkflowV2] Adding zones for MID:', mid, siteAppName, zones, zoneUrl, payoutRate)
    setMidWithZones(prev => {
      // Remove existing entry for this MID if any
      const filtered = prev.filter(m => m.mid !== mid)
      return [...filtered, { mid, siteAppName, zones }]
    })
  }, [])

  // Step 1: Remove a MID
  const handleRemoveMid = useCallback((mid: string) => {
    console.log('[TagCreationWorkflowV2] Removing MID:', mid)
    setMidWithZones(prev => prev.filter(m => m.mid !== mid))
    // Also remove from synced MIDs
    setSyncedMids(prev => {
      const updated = new Set(prev)
      updated.delete(mid)
      return updated
    })
  }, [])

  // Handle real-time sync of domain and payout rate from Step 1 (Web)
  const handleWebValuesChange = useCallback((domain: string, payoutRate: string) => {
    setAppstoreUrlFromStep1(domain)
    setPayoutRateFromStep1(payoutRate)
  }, [])

  // Step 2: CSV upload callback handler (NEW - replaces screenshot extraction)
  const handleCSVUploadComplete = useCallback((result: CSVUploadResult) => {
    console.log('[TagCreationWorkflowV2] CSV upload complete:', result)
    setCsvResult(result)
    setExtractedZones(result.zones)
  }, [])

  // Step 3 callback handler - track synced MIDs
  const handleDataEntryComplete = useCallback((zones: any[]) => {
    console.log('[TagCreationWorkflowV2] Workflow completed! Synced to Google Sheets:', zones)
  }, [])

  // Step 3: Sync a MID
  const handleSyncMid = useCallback((mid: string, data: any[]) => {
    console.log('[TagCreationWorkflowV2] Synced MID:', mid)
    setSyncedMids(prev => new Set(prev).add(mid))
  }, [])

  return (
    <div className="space-y-8">
      {/* Team Type Toggle */}
      <div className="flex items-center justify-between py-2 border-b">
        <span className="text-sm font-medium text-gray-700">Team</span>
        <ToggleGroup
          type="single"
          value={teamType}
          onValueChange={(value) => {
            if (value) handleTeamTypeChange(value as TeamType)
          }}
          className="gap-1"
        >
          <ToggleGroupItem
            value="app"
            aria-label="Team App"
            className="text-xs px-3 py-1"
          >
            <Smartphone className="h-3 w-3 mr-1" />
            App
          </ToggleGroupItem>
          <ToggleGroupItem
            value="web"
            aria-label="Team Web"
            className="text-xs px-3 py-1"
          >
            <Globe className="h-3 w-3 mr-1" />
            Web
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Step 0: Media Preparation (Optional) */}
      <MediaPreparationStep
        key={`media-preparation-${resetCounter}`}
        onComplete={handleStep0Complete}
      />

      {/* Step 1: Generate Zones (Optional) */}
      {teamType === 'app' && (
        <AppPromptInputStep
          key={`app-step-${resetCounter}`}
          step0Data={step0Data}
          midWithZones={midWithZones}
          onAddMidZones={handleAddMidZones}
          onRemoveMid={handleRemoveMid}
          onComplete={handleAppStepComplete}
        />
      )}
      {teamType === 'web' && (
        <WebPromptInputStep
          key={`web-step-${resetCounter}`}
          step0Data={step0Data}
          midWithZones={midWithZones}
          onAddMidZones={handleAddMidZones}
          onRemoveMid={handleRemoveMid}
          onComplete={handleWebStepComplete}
          onValuesChange={handleWebValuesChange}
        />
      )}

      {/* Step 2: CSV Upload (Required) - NEW IN V2 */}
      <CSVUploadStep
        key={`csv-upload-${resetCounter}`}
        teamType={teamType}
        onComplete={handleCSVUploadComplete}
        onBack={() => {}}
      />

      {/* Step 3: Sync to Sheets (Required) */}
      <ZoneDataEntryStep
        key={`zone-data-entry-${resetCounter}`}
        teamType={teamType}
        zones={extractedZones}
        initialAppstoreUrl={appstoreUrlFromStep1}
        initialPayoutRate={payoutRateFromStep1}
        step0Data={step0Data}
        syncedMids={syncedMids}
        csvResult={csvResult} // NEW: Pass CSV result for PID auto-fill
        onSyncMid={handleSyncMid}
        onComplete={handleDataEntryComplete}
        onReset={handleReset}
        onBack={() => {}}
      />
    </div>
  )
}
