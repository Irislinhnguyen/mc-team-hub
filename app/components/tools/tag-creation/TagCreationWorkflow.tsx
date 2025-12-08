'use client'

import { useState } from 'react'
import { PromptInputStep } from './PromptInputStep'
import { ZoneExtractionStep } from './ZoneExtractionStep'
import { ZoneDataEntryStep } from './ZoneDataEntryStep'
import type { GeneratedZone, ExtractedZone } from '@/lib/types/tools'

export function TagCreationWorkflow() {
  const [generatedZones, setGeneratedZones] = useState<GeneratedZone[]>([])
  const [extractedZones, setExtractedZones] = useState<ExtractedZone[]>([])

  // Store App ID and Appstore URL from Step 1
  const [appIdFromStep1, setAppIdFromStep1] = useState<string>('')
  const [appstoreUrlFromStep1, setAppstoreUrlFromStep1] = useState<string>('')

  return (
    <div className="space-y-6">
      {/* Step 1: Generate CSV (Optional - always visible) */}
      <PromptInputStep
        onComplete={(zones, appId, appstoreUrl) => {
          setGeneratedZones(zones)
          setAppIdFromStep1(appId || '')
          setAppstoreUrlFromStep1(appstoreUrl || '')
        }}
      />

      {/* Step 2: Extract Zones (Mandatory - always visible) */}
      <ZoneExtractionStep
        onComplete={(zones) => {
          setExtractedZones(zones)
        }}
        onBack={() => {}}
      />

      {/* Step 3: Enter Metadata & Sync to Sheets (always visible) */}
      <ZoneDataEntryStep
        zones={extractedZones}
        initialAppId={appIdFromStep1}
        initialAppstoreUrl={appstoreUrlFromStep1}
        onComplete={(zones) => {
          console.log('Workflow completed! Synced to Google Sheets:', zones)
        }}
        onBack={() => {}}
      />
    </div>
  )
}
