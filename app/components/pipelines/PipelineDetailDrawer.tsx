'use client'

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

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return date
  }
}

export function PipelineDetailDrawer({ pipeline, open, onClose }: PipelineDetailDrawerProps) {
  if (!pipeline) return null

  // Only handle CS pipelines for now - Sales coming later
  if (pipeline.group !== 'cs') {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-[480px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Sales Pipeline View</SheetTitle>
          </SheetHeader>
          <div className="p-8 text-center text-muted-foreground">
            Sales pipeline detail view coming soon...
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">
            {pipeline.publisher || 'Pipeline Details'}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{pipeline.status}</Badge>
            <Badge variant="outline">CS</Badge>
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

            {/* 2. Pipeline Details (CS-specific fields) */}
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
                <InfoRow label="ZID" value={pipeline.zid} />
                <InfoRow label="Progress %" value={`${pipeline.progress_percent || 0}%`} />
              </CardContent>
            </Card>

            {/* 3. Timeline (CS-specific) */}
            <TimelineCard pipeline={pipeline} />

            {/* 4. Actions (CS-specific: action_date, action_progress, next_action) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Action Date" value={formatDate(pipeline.action_date)} />
                <InfoRow label="Action Progress" value={pipeline.action_progress} />
                <InfoRow label="Next Action" value={pipeline.next_action} />
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
                  window.open('/pipelines/sheet-config', '_blank')
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Edit in Google Sheets
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Pipelines are managed via Google Sheets. Changes sync automatically.
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
