'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2, FileDown } from 'lucide-react'
import type { GeneratedZone } from '@/lib/types/tools'
import { HelpIcon } from './HelpIcon'


interface PromptInputStepProps {
  onComplete: (zones: GeneratedZone[], appId?: string, appstoreUrl?: string) => void
}

export function PromptInputStep({ onComplete }: PromptInputStepProps) {
  const [zoneUrl, setZoneUrl] = useState('')
  const [prompt, setPrompt] = useState('Create 3 reward zones with FR: 0.4, 0.12, 0.67 respectively - add "_pack 1" at the end of each zone name, and 2 interstitial zones with FR: 0.85, 0.90 - add "_pack 2" at the end')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      onComplete([], appId, url)
    }
  }

  const handleGenerate = async () => {
    if (!zoneUrl.trim()) {
      setError('Please enter a Zone URL')
      return
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt describing the zones you want to create')
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
        body: JSON.stringify({ zoneUrl, prompt }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate CSV')
      }

      // Get zone count from header
      const zoneCount = parseInt(response.headers.get('X-Zone-Count') || '0', 10)

      // Download the CSV file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zones_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Extract App ID from URL
      let appId = ''

      // iOS App Store URL: https://apps.apple.com/.../app/app-name/id123456789
      const iosMatch = zoneUrl.match(/id(\d+)/)
      if (iosMatch) {
        appId = iosMatch[1]
      }

      // Android Play Store URL: https://play.google.com/store/apps/details?id=com.example.app
      const androidMatch = zoneUrl.match(/id=([a-zA-Z0-9._]+)/)
      if (androidMatch) {
        appId = androidMatch[1]
      }

      // Move to next step, passing App ID and Appstore URL
      onComplete([], appId, zoneUrl)
    } catch (err: any) {
      console.error('Error generating CSV:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            1
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base text-[#1565C0]">Generate Zone CSV</CardTitle>
            <span className="text-xs text-gray-500 font-normal">(Optional)</span>
            <HelpIcon
              title="How to use (Optional Step)"
              content={`This step is OPTIONAL - skip if you already created zones in your ad platform.

1. Enter the App Store or Google Play URL in the first field
2. Describe your zones in natural language
3. The AI will generate a CSV file
4. Upload the CSV to your ad platform to create zones

Example:
URL: https://apps.apple.com/vn/app/garden-flourish/id6752558926

Configuration:
"Create 3 reward zones with FR: 0.4, 0.12, 0.67 respectively - add "_pack 1" at the end of each zone name, and 2 interstitial zones with FR: 0.85, 0.90 - add "_pack 2" at the end"

If you already have zones created, skip this step and go to Step 2.`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
              // Auto-extract and pass App ID to Step 3 immediately
              extractAndPassAppId(url)
            }}
            placeholder="https://apps.apple.com/app/id6752558926"
          />
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
            placeholder='e.g., Create 3 reward zones with FR: 0.4, 0.12, 0.67 respectively - add "_pack 1" at the end of each zone name'
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

        {/* Generate Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !zoneUrl.trim() || !prompt.trim()}
            size="lg"
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating CSV...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generate CSV
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
