'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy } from 'lucide-react'
import { POC_NAMES } from '@/lib/types/pipeline'
import type { Pipeline } from '@/lib/types/pipeline'
import { generateReport } from '@/lib/utils/pipelineReportFormatter'
import { useToast } from '@/app/hooks/use-toast'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'

interface PipelineReportCardProps {
  pipelines: Pipeline[]
}

export function PipelineReportCard({ pipelines }: PipelineReportCardProps) {
  const [selectedPOC, setSelectedPOC] = useState<string>('all')
  const [reportText, setReportText] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  // Filter pipelines
  const filteredPipelines = useMemo(() => {
    let filtered = pipelines.filter(p =>
      // Only include pipelines with action items
      (p.action_detail || p.next_action) &&
      // Exclude closed pipelines
      !['【S】', '【S-】', '【Z】', '【D】', '【E】', '【F】'].includes(p.status)
    )

    if (selectedPOC !== 'all') {
      filtered = filtered.filter(p => p.poc === selectedPOC)
    }

    // Sort by starting_date (soonest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.starting_date || '9999-12-31')
      const dateB = new Date(b.starting_date || '9999-12-31')
      return dateA.getTime() - dateB.getTime()
    })
  }, [pipelines, selectedPOC])

  // Generate report with AI summarization (async)
  useEffect(() => {
    async function generate() {
      if (filteredPipelines.length === 0) {
        setReportText('')
        return
      }

      setGenerating(true)
      try {
        const report = await generateReport(filteredPipelines)
        setReportText(report)
      } catch (error) {
        console.error('Failed to generate report:', error)
        toast({
          title: 'Error',
          description: 'Failed to generate report',
          variant: 'destructive',
        })
      } finally {
        setGenerating(false)
      }
    }
    generate()
  }, [filteredPipelines, toast])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText)
    toast({
      title: 'Success',
      description: 'Report copied to clipboard!',
    })
  }

  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <h3
          className="font-semibold mb-2"
          style={{
            fontSize: typography.sizes.sectionTitle,
            color: colors.main
          }}
        >
          Pipeline Report Generator ({filteredPipelines.length})
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <Select value={selectedPOC} onValueChange={setSelectedPOC}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Select POC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All POCs</SelectItem>
              {POC_NAMES.map(poc => (
                <SelectItem key={poc} value={poc}>{poc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!reportText || generating}
            className="h-8 w-8 p-0"
            title="Copy to Clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Report Preview - Match height with Missing PID/MID table */}
        <div
          className="overflow-y-auto"
          style={{
            height: '400px'
          }}
        >
          {generating ? (
            <div
              className="text-center py-8"
              style={{
                fontSize: typography.sizes.dataPoint,
                color: colors.text.tertiary
              }}
            >
              Generating report with AI summarization...
            </div>
          ) : (
            <div
              className="whitespace-pre-wrap leading-tight"
              style={{
                fontSize: typography.sizes.dataPoint,
                color: colors.text.primary
              }}
              dangerouslySetInnerHTML={{
                __html: reportText
                  ? reportText
                      .replace(/^- Status:/gm, '- <strong>Status:</strong>')
                      .replace(/^- Action Plan:/gm, '- <strong>Action Plan:</strong>')
                  : 'No pipelines with action items found'
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
