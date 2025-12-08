'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, ExternalLink, Upload } from 'lucide-react'
import type { ExtractedZone } from '@/lib/types/tools'
import { HelpIcon } from './HelpIcon'

interface SheetsSyncStepProps {
  zones: ExtractedZone[]
  onComplete: () => void
  onBack: () => void
}

export function SheetsSyncStep({ zones, onComplete, onBack }: SheetsSyncStepProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('1gfCTHCfpTqhb6pzpEhkYx3RxvMhOlhB4pB2iUlSWBNs')
  const [sheetName, setSheetName] = useState('App_Tag Requests')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; sheetUrl?: string; error?: string } | null>(null)

  const handleSync = async () => {
    if (!spreadsheetId.trim()) {
      setSyncResult({ success: false, error: 'Please enter a spreadsheet ID or URL' })
      return
    }

    setIsSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/tools/tag-creation/sync-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zones,
          spreadsheetId: spreadsheetId.trim(),
          sheetName: sheetName.trim() || 'Zone IDs',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync to Google Sheets')
      }

      setSyncResult({
        success: true,
        sheetUrl: data.sheetUrl,
      })

      // Call onComplete after a short delay
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (err: any) {
      console.error('Error syncing to sheets:', err)
      setSyncResult({
        success: false,
        error: err.message,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            4
          </div>
          <div className="flex items-center">
            <CardTitle className="text-base">Sync to Google Sheets</CardTitle>
            <HelpIcon
              title="How to sync"
              content={`1. Enter your Google Sheets ID or full URL
2. Optionally specify the sheet tab name (default: "App_Tag Requests")
3. Make sure the sheet is shared with:
   n8n-bigquery-service@gcpp-check.iam.gserviceaccount.com
   (Grant Editor access)
4. Click "Sync to Google Sheets" button

The data will be written to your sheet automatically.`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Google Sheets Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Spreadsheet ID or URL</label>
            <Input
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="1gfCTHCfpTqhb6pzpEhkYx3RxvMhOlhB4pB2iUlSWBNs"
              className="font-mono text-sm h-9"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Sheet Name (optional)</label>
            <Input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="App_Tag Requests"
              className="h-9"
            />
          </div>
        </div>

        {/* Success Message */}
        {syncResult?.success && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#1565C0] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Successfully synced!
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  {zones.length} zones have been written to your Google Sheet
                </p>
                {syncResult.sheetUrl && (
                  <a
                    href={syncResult.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#1565C0] hover:text-[#0D47A1] hover:underline"
                  >
                    Open Google Sheet
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {syncResult?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <svg className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 mb-1">Sync Failed</p>
                <p className="text-sm text-red-700">{syncResult.error}</p>
                {syncResult.error.includes('Permission denied') && (
                  <p className="text-xs text-red-600 mt-2">
                    Please check that the service account has Editor access
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sync Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSync}
            disabled={isSyncing || syncResult?.success}
            size="lg"
            className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing to Google Sheets...
              </>
            ) : syncResult?.success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Completed!
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Sync to Google Sheets
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
