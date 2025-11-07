'use client'

import { ReactNode } from 'react'
import EntityAnalysisView, { EntityConfig } from './EntityAnalysisView'
import SummaryMetrics, { SummaryMetricItem } from './SummaryMetrics'
import MetricsGrid, { MetricItem } from './MetricsGrid'
import { safeToFixed, formatCompactNumber } from '../../../lib/utils/formatters'
import { TierType } from '../../../lib/utils/tierClassification'

interface PIDData {
  pid: number
  pubname: string

  // Revenue
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number

  // Scale
  total_mids_p1: number
  total_mids_p2: number
  mid_change: number

  // Performance
  avg_fill_rate_p1: number
  avg_fill_rate_p2: number
  fill_rate_change_pct: number
  avg_ecpm_p1: number
  avg_ecpm_p2: number
  ecpm_change_pct: number

  // Distribution (6-tier system)
  hero_mids: number
  solid_mids: number
  underperformer_mids: number
  remove_mids: number
  new_mids: number
  lost_mids: number

  // Tier (from API)
  tier?: TierType
}

interface PIDAnalysisViewProps {
  data: PIDData[]
  loading: boolean
  period1?: { start: string; end: string }
  period2?: { start: string; end: string }
  filters?: Record<string, any>
  onRefresh?: () => void
}

// PID Configuration for EntityAnalysisView
const pidConfig: EntityConfig<PIDData> = {
  // Entity identification
  entityType: 'pid',
  entityKeyField: 'pid',
  entityDisplayName: (item) => `${item.pid} - ${item.pubname}`,
  entitySubtitle: () => 'Publisher',

  // Tier already provided by API
  getTierData: undefined,

  // Child entity configuration
  childType: 'mid',
  childApiPath: '/api/performance-tracker/deep-dive/pid/mids',
  childTierCounts: (item) => ({
    hero: item.hero_mids,
    solid: item.solid_mids,
    underperformer: item.underperformer_mids,
    remove: item.remove_mids,
    new: item.new_mids,
    lost: item.lost_mids
  }),

  // AI Insights
  aiApiPath: '/api/performance-tracker/deep-dive/pid/ai-insights',

  // No additional badges for PID
  renderAdditionalBadges: () => null,

  // Summary metrics in card header
  renderSummaryMetrics: (item) => {
    const metrics: SummaryMetricItem[] = [
      {
        label: 'Revenue',
        value: item.total_rev_p2,
        changePercent: item.rev_change_pct,
        prefix: '$',
        compact: true
      },
      {
        label: 'Media IDs',
        value: item.total_mids_p2,
        formatter: (v) => formatCompactNumber(v, 0)
      },
      {
        label: 'eCPM',
        value: item.avg_ecpm_p2,
        formatter: (v) => `$${safeToFixed(v, 2)}`
      }
    ]

    return <SummaryMetrics metrics={metrics} />
  },

  // Metrics grid in expanded content
  renderMetricsGrid: (item) => {
    const metrics: MetricItem[] = [
      {
        label: 'Avg eCPM',
        value: item.avg_ecpm_p2,
        changePercent: item.ecpm_change_pct,
        formatter: (v) => safeToFixed(v, 2),
        prefix: '$'
      },
      {
        label: 'Avg Fill Rate',
        value: item.avg_fill_rate_p2,
        changePercent: item.fill_rate_change_pct,
        formatter: (v) => safeToFixed(v, 1),
        suffix: '%'
      },
      {
        label: 'Media Count',
        value: item.total_mids_p2,
        formatter: (v) => formatCompactNumber(v, 0)
      }
    ]

    return <MetricsGrid metrics={metrics} columns={3} />
  }
}

/**
 * PIDAnalysisView - Publisher Performance Analysis
 *
 * Refactored to use EntityAnalysisView HOC with custom configuration
 */
export function PIDAnalysisView({
  data,
  loading,
  period1 = { start: '', end: '' },
  period2 = { start: '', end: '' },
  filters = {},
  onRefresh
}: PIDAnalysisViewProps) {
  return (
    <EntityAnalysisView
      config={pidConfig}
      data={data}
      loading={loading}
      period1={period1}
      period2={period2}
      filters={filters}
      onRefresh={onRefresh}
    />
  )
}

export default PIDAnalysisView
