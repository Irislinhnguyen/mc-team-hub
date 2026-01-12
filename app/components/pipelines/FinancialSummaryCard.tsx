import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Pipeline } from '@/lib/types/pipeline'
import { InfoRow } from './InfoRow'

interface FinancialSummaryCardProps {
  pipeline: Pipeline
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '$0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num) || num === 0) return '$0'
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return date
  }
}

export function FinancialSummaryCard({ pipeline }: FinancialSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hero Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Q Gross</div>
            <div className="text-2xl font-bold text-[#1565C0]">
              {formatCurrency(pipeline.q_gross)}
            </div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Q Net Rev</div>
            <div className="text-2xl font-bold text-[#1565C0]">
              {formatCurrency(pipeline.q_net_rev)}
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Max Gross</div>
            <div className="text-sm font-semibold">{formatCurrency(pipeline.max_gross)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Day Gross</div>
            <div className="text-sm font-semibold">{formatCurrency(pipeline.day_gross)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Day Net Rev</div>
            <div className="text-sm font-semibold">{formatCurrency(pipeline.day_net_rev)}</div>
          </div>
        </div>

        {/* Input Values */}
        <div className="space-y-0 border-t pt-4">
          <InfoRow
            label="Request (IMP)"
            value={pipeline.imp ? pipeline.imp.toLocaleString() : '—'}
          />
          <InfoRow
            label="eCPM"
            value={pipeline.ecpm ? `$${pipeline.ecpm}` : '—'}
          />
          <InfoRow
            label="Revenue Share"
            value={pipeline.revenue_share ? `${pipeline.revenue_share}%` : '—'}
          />
          <InfoRow
            label="Starting Date"
            value={formatDate(pipeline.starting_date)}
          />
          <InfoRow
            label="Status"
            value={pipeline.status}
          >
            <Badge>{pipeline.status}</Badge>
          </InfoRow>
        </div>
      </CardContent>
    </Card>
  )
}
