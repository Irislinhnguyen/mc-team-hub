'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Pipeline } from '@/lib/types/pipeline'
import { MonthlyForecastView } from './MonthlyForecastView'
import { FinancialSummaryCard } from './FinancialSummaryCard'
import { TimelineCard } from './TimelineCard'
import { InfoRow } from './InfoRow'

interface PipelineDetailDrawerProps {
  pipeline: Pipeline | null
  open: boolean
  onClose: () => void
}

interface QuarterlySheet {
  spreadsheet_id: string
  sheet_name: string
  sheet_url: string
}

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return date
  }
}

// Get GID from sheet URL
function extractGid(sheetUrl: string): string | null {
  const match = sheetUrl.match(/gid=([0-9]+)/)
  return match ? match[1] : null
}

export function PipelineDetailDrawer({ pipeline, open, onClose }: PipelineDetailDrawerProps) {
  const [quarterlySheet, setQuarterlySheet] = useState<QuarterlySheet | null>(null)

  // Fetch quarterly sheet info when pipeline changes
  useEffect(() => {
    if (pipeline?.quarterly_sheet_id) {
      fetchQuarterlySheet(pipeline.quarterly_sheet_id)
    }
  }, [pipeline?.quarterly_sheet_id])

  async function fetchQuarterlySheet(id: string) {
    try {
      console.log('[PipelineDetailDrawer] Fetching quarterly sheet:', id)
      const response = await fetch(`/api/pipelines/quarterly-sheets/${id}`)
      console.log('[PipelineDetailDrawer] Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[PipelineDetailDrawer] Quarterly sheet data:', data)
        setQuarterlySheet({
          spreadsheet_id: data.spreadsheet_id,
          sheet_name: data.sheet_name,
          sheet_url: data.sheet_url,
        })
      } else {
        const errorText = await response.text()
        console.error('[PipelineDetailDrawer] API error:', response.status, errorText)
      }
    } catch (error) {
      console.error('[PipelineDetailDrawer] Failed to fetch quarterly sheet:', error)
    }
  }

  if (!pipeline) return null

  // Generate direct-to-row Google Sheet URL
  const getSheetRowUrl = (): string | null => {
    console.log('[PipelineDetailDrawer] getSheetRowUrl - sheet_row_number:', pipeline.sheet_row_number, 'quarterlySheet:', quarterlySheet)
    if (!pipeline.sheet_row_number || !quarterlySheet) return null

    const { spreadsheet_id, sheet_url } = quarterlySheet
    const gid = extractGid(sheet_url)
    const row = pipeline.sheet_row_number

    console.log('[PipelineDetailDrawer] Extracted GID:', gid, 'row:', row)

    if (!gid) return null

    // URL format: https://docs.google.com/spreadsheets/d/[ID]/edit#gid=[GID]&range=[ROW]:[ROW]
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheet_id}/edit#gid=${gid}&range=${row}:${row}`
    console.log('[PipelineDetailDrawer] Generated URL:', url)
    return url
  }

  const sheetRowUrl = getSheetRowUrl()
  const buttonText = sheetRowUrl
    ? `Edit in Google Sheets (Row ${pipeline.sheet_row_number})`
    : 'Edit in Google Sheets'

  console.log('[PipelineDetailDrawer] Render - sheetRowUrl:', sheetRowUrl, 'buttonText:', buttonText)

  const isCSPipeline = pipeline.group === 'cs'
  const isSalesPipeline = pipeline.group === 'sales'
  const groupLabel = pipeline.group?.toUpperCase() || 'CS'

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">
            {pipeline.publisher || 'Pipeline Details'}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{pipeline.status}</Badge>
            <Badge variant="outline">{groupLabel}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* 1. Financial Summary */}
            <FinancialSummaryCard pipeline={pipeline} />

            {/* 2. Pipeline Details - Common fields + group-specific fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Classification" value={pipeline.classification} />
                <InfoRow label="POC" value={pipeline.poc} />
                <InfoRow label="PID" value={pipeline.pid} />
                <InfoRow label="MID" value={pipeline.mid} />
                <InfoRow label="Domain" value={pipeline.domain} />
                <InfoRow label="Product" value={pipeline.product} />
                <InfoRow label="Channel" value={pipeline.channel} />
                <InfoRow label="Progress %" value={`${pipeline.progress_percent || 0}%`} />

                {/* Common: ZID (both CS and Sales) */}
                <InfoRow label="ZID" value={pipeline.zid || '—'} />

                {/* Common: ready_to_deliver_date, closed_date (both CS and Sales) */}
                <InfoRow label="Ready to Deliver Date" value={formatDate(pipeline.ready_to_deliver_date)} />
                <InfoRow label="Closed Date" value={formatDate(pipeline.closed_date)} />

                {/* Sales-specific: C+ Upgrade */}
                {isSalesPipeline && (
                  <InfoRow label="C+ Upgrade" value={pipeline.c_plus_upgrade || '—'} />
                )}
              </CardContent>
            </Card>

            {/* 3. Timeline */}
            <TimelineCard pipeline={pipeline} />

            {/* 4. Actions - Different field order for CS vs Sales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Action Date" value={formatDate(pipeline.action_date)} />
                {isCSPipeline && (
                  <>
                    <InfoRow label="Action Progress" value={pipeline.action_progress} />
                    <InfoRow label="Next Action" value={pipeline.next_action} />
                  </>
                )}
                {isSalesPipeline && (
                  <>
                    <InfoRow label="Action Progress" value={pipeline.action_progress} />
                    <InfoRow label="Next Action" value={pipeline.next_action} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* 5. Footer Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-[#1565C0] hover:bg-[#0D47A1]"
                onClick={() => {
                  if (sheetRowUrl) {
                    window.open(sheetRowUrl, '_blank')
                  } else {
                    window.open('/pipelines/sheet-config', '_blank')
                  }
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {buttonText}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {sheetRowUrl
                ? `Opening Row ${pipeline.sheet_row_number} in Google Sheets. Changes sync automatically.`
                : 'Pipelines are managed via Google Sheets. Changes sync automatically.'}
            </p>
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <MonthlyForecastView pipeline={pipeline} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
