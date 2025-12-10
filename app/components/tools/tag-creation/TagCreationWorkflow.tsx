'use client'

import { useState, useCallback } from 'react'
import { AppPromptInputStep } from './AppPromptInputStep'
import { WebPromptInputStep } from './WebPromptInputStep'
import { ZoneExtractionStep } from './ZoneExtractionStep'
import { ZoneDataEntryStep } from './ZoneDataEntryStep'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Smartphone, Globe } from 'lucide-react'
import type { GeneratedZone, ExtractedZone, TeamType } from '@/lib/types/tools'

export function TagCreationWorkflow() {
  const [teamType, setTeamType] = useState<TeamType>('app')
  const [generatedZones, setGeneratedZones] = useState<GeneratedZone[]>([])
  const [extractedZones, setExtractedZones] = useState<ExtractedZone[]>([])

  // Store App ID, Appstore URL, and Payout Rate from Step 1
  const [appIdFromStep1, setAppIdFromStep1] = useState<string>('')
  const [appstoreUrlFromStep1, setAppstoreUrlFromStep1] = useState<string>('')
  const [payoutRateFromStep1, setPayoutRateFromStep1] = useState<string>('')

  // Debug: log every render
  console.log('[TagCreationWorkflow] Render:', {
    teamType,
    extractedZonesCount: extractedZones.length,
    appIdFromStep1,
    payoutRateFromStep1
  })

  // Reset entire workflow to start fresh
  const handleReset = useCallback(() => {
    setGeneratedZones([])
    setExtractedZones([])
    setAppIdFromStep1('')
    setAppstoreUrlFromStep1('')
    setPayoutRateFromStep1('')
    // Reload the page to reset all component states
    window.location.reload()
  }, [])

  // Handle team type change with confirmation if data exists
  const handleTeamTypeChange = useCallback((newTeamType: TeamType) => {
    const hasData = extractedZones.length > 0 || appIdFromStep1 || appstoreUrlFromStep1

    if (hasData) {
      const confirmed = window.confirm(
        'Switching team type will reset all entered data. Are you sure you want to continue?'
      )
      if (!confirmed) return

      // Reset state without page reload
      setGeneratedZones([])
      setExtractedZones([])
      setAppIdFromStep1('')
      setAppstoreUrlFromStep1('')
      setPayoutRateFromStep1('')
    }

    setTeamType(newTeamType)
  }, [extractedZones.length, appIdFromStep1, appstoreUrlFromStep1])

  // Step 1 callback handlers (memoized to prevent re-renders)
  const handleAppStepComplete = useCallback((zones: GeneratedZone[], appId?: string, appstoreUrl?: string, payoutRate?: string) => {
    setGeneratedZones(zones)
    setAppIdFromStep1(appId || '')
    setAppstoreUrlFromStep1(appstoreUrl || '')
    setPayoutRateFromStep1(payoutRate || '')
  }, [])

  const handleWebStepComplete = useCallback((zones: ExtractedZone[], appId?: string, appstoreUrl?: string, payoutRate?: string) => {
    // Only update if we have zones (not empty array)
    if (zones.length > 0) {
      setExtractedZones(zones) // For Web, zones go directly to extractedZones
    }
    if (appId) setAppIdFromStep1(appId)
    if (appstoreUrl) setAppstoreUrlFromStep1(appstoreUrl)
    if (payoutRate) setPayoutRateFromStep1(payoutRate)
  }, [])

  // Handle real-time sync of domain and payout rate from Step 1 (Web)
  const handleWebValuesChange = useCallback((domain: string, payoutRate: string) => {
    setAppstoreUrlFromStep1(domain)
    setPayoutRateFromStep1(payoutRate)
  }, [])

  // Step 2 callback handler
  const handleExtractionComplete = useCallback((zones: ExtractedZone[]) => {
    setExtractedZones(zones)
  }, [])

  // Step 3 callback handler
  const handleDataEntryComplete = useCallback((zones: any[]) => {
    console.log('Workflow completed! Synced to Google Sheets:', zones)
  }, [])

  return (
    <div className="space-y-6">
      {/* Team Type Toggle */}
      <Card className="border border-gray-100">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Select Team Type</h3>
            <ToggleGroup
              type="single"
              value={teamType}
              onValueChange={(value) => {
                if (value) handleTeamTypeChange(value as TeamType)
              }}
              className="gap-2"
            >
              <ToggleGroupItem
                value="app"
                aria-label="Team App"
                className="flex items-center gap-2 px-4"
              >
                <Smartphone className="h-4 w-4" />
                Team App
              </ToggleGroupItem>
              <ToggleGroupItem
                value="web"
                aria-label="Team Web"
                className="flex items-center gap-2 px-4"
              >
                <Globe className="h-4 w-4" />
                Team Web
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
      </Card>

      {/* Step 1: Conditional rendering based on team type */}
      {teamType === 'app' && <AppPromptInputStep onComplete={handleAppStepComplete} />}
      {teamType === 'web' && <WebPromptInputStep key="web-step" onComplete={handleWebStepComplete} onValuesChange={handleWebValuesChange} />}

      {/* Step 2: Extract Zones (Always visible) */}
      <ZoneExtractionStep
        teamType={teamType}
        preGeneratedZones={teamType === 'web' ? extractedZones : undefined}
        onComplete={handleExtractionComplete}
        onBack={() => {}}
      />

      {/* Step 3: Enter Metadata & Sync to Sheets (Always visible) */}
      <ZoneDataEntryStep
        teamType={teamType}
        zones={extractedZones}
        initialAppId={appIdFromStep1}
        initialAppstoreUrl={appstoreUrlFromStep1}
        initialPayoutRate={payoutRateFromStep1}
        onComplete={handleDataEntryComplete}
        onReset={handleReset}
        onBack={() => {}}
      />
    </div>
  )
}
