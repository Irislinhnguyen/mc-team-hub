'use client'

export const dynamic = 'force-dynamic'

/**
 * Quarterly Sheets Configuration Page
 *
 * Manages Google Sheets sync for each quarter
 * Each sheet has its own sync button
 */

import { useState, useEffect } from 'react'
import { QuarterlySheetManager } from '@/app/components/pipelines/QuarterlySheetManager'
import { AddQuarterlySheetModal } from '@/app/components/pipelines/AddQuarterlySheetModal'
import { QuarterlySheetTableSkeleton } from '@/app/components/pipelines/skeletons'
import { PipelinePageLayout } from '@/app/components/pipelines/PipelinePageLayout'
import { QuarterlySheetTableSkeleton as SheetConfigSkeleton } from '@/app/components/pipelines/skeletons'

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
        setSheets(data.data || [])
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
      <PipelinePageLayout
        title="Quarterly Sheets Configuration"
        subtitle="Manage Google Sheets sync for each quarter. Click sync to update pipelines from specific sheets."
        headerActions={<AddQuarterlySheetModal onSheetAdded={fetchSheets} />}
      >
        <QuarterlySheetTableSkeleton rows={5} />
      </PipelinePageLayout>
    )
  }

  if (error) {
    return (
      <PipelinePageLayout
        title="Quarterly Sheets Configuration"
        subtitle="Manage Google Sheets sync for each quarter. Click sync to update pipelines from specific sheets."
        headerActions={<AddQuarterlySheetModal onSheetAdded={fetchSheets} />}
      >
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
      </PipelinePageLayout>
    )
  }

  return (
    <PipelinePageLayout
      title="Quarterly Sheets Configuration"
      subtitle="Manage Google Sheets sync for each quarter. Click sync to update pipelines from specific sheets."
      headerActions={<AddQuarterlySheetModal onSheetAdded={fetchSheets} />}
    >
      {/* Quarterly Sheets Table */}
      {sheets.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center bg-white">
          <h3 className="mb-2 text-lg font-semibold">No quarterly sheets configured</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add a quarterly sheet to start syncing your pipeline data.
          </p>
          <p className="text-xs text-muted-foreground">
            Click the "Add Quarterly Sheet" button to register a new sheet.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <QuarterlySheetManager
            sheets={sheets}
            onRefresh={fetchSheets}
          />
        </div>
      )}
    </PipelinePageLayout>
  )
}
