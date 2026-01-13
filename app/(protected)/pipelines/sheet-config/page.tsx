'use client'

/**
 * Quarterly Sheets Configuration Page
 *
 * Manages Google Sheets sync for each quarter
 * Each sheet has its own sync button
 */

import { useState, useEffect } from 'react'
import { QuarterlySheetManager } from '@/app/components/pipelines/QuarterlySheetManager'

interface QuarterlySheet {
  id: string
  year: number
  quarter: number
  group: 'sales' | 'cs'
  spreadsheet_id: string
  sheet_name: string
  sheet_url: string
  sync_status: 'active' | 'paused' | 'archived'
  last_sync_at: string | null
  last_sync_status: 'success' | 'failed' | 'partial' | null
  last_sync_error: string | null
  webhook_token: string | null
  pipeline_count?: number
}

export default function SheetConfigPage() {
  const [sheets, setSheets] = useState<QuarterlySheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch quarterly sheets
  const fetchSheets = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pipelines/quarterly-sheets')
      const data = await response.json()

      if (data.success) {
        setSheets(data.sheets || [])
      } else {
        setError(data.error || 'Failed to fetch quarterly sheets')
      }
    } catch (err: any) {
      console.error('Failed to fetch sheets:', err)
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSheets()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
            <p className="text-muted-foreground">Loading quarterly sheets...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Sheets</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchSheets}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1565C0]">Quarterly Sheets Configuration</h1>
        <p className="text-muted-foreground">
          Manage Google Sheets sync for each quarter. Click sync to update pipelines from specific sheets.
        </p>
      </div>

      {/* Quarterly Sheets Table */}
      {sheets.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">No quarterly sheets configured</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add a quarterly sheet to start syncing your pipeline data.
          </p>
          <p className="text-xs text-muted-foreground">
            Quarterly sheets can be registered via the database or API.
          </p>
        </div>
      ) : (
        <QuarterlySheetManager
          sheets={sheets}
          onRefresh={fetchSheets}
        />
      )}
    </div>
  )
}
