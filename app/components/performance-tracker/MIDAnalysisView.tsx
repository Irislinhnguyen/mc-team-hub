'use client'

import { ReactNode } from 'react'
import EntityAnalysisView, { EntityConfig } from './EntityAnalysisView'
import SummaryMetrics, { SummaryMetricItem } from './SummaryMetrics'
import MetricsGrid, { MetricItem } from './MetricsGrid'
import { safeToFixed, formatCompactNumber } from '../../../lib/utils/formatters'
import { TierType } from '../../../lib/utils/tierClassification'

interface MIDData {
  mid: number
  medianame: string

  // Revenue
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number

  // Scale
  total_zones_p1: number
  total_zones_p2: number
  zone_change: number

  // Performance
  avg_fill_rate_p1: number
  avg_fill_rate_p2: number
  fill_rate_change_pct: number
  avg_ecpm_p1: number
  avg_ecpm_p2: number
  ecpm_change_pct: number

  // Distribution (6-tier system)
  hero_zones: number
  solid_zones: number
  underperformer_zones: number
  remove_zones: number
  new_zones: number
  lost_zones: number

  // Tier (from API)
  tier?: TierType
}

interface MIDAnalysisViewProps {
  data: MIDData[]
  loading: boolean
  period1?: { start: string; end: string }
  period2?: { start: string; end: string }
  filters?: Record<string, any>
  onRefresh?: () => void
}

// MID Configuration for EntityAnalysisView
const midConfig: EntityConfig<MIDData> = {
  // Entity identification
  entityType: 'mid',
  entityKeyField: 'mid',
  entityDisplayName: (item) => `${item.mid} - ${item.medianame}`,
  entitySubtitle: () => 'Media',

  // Tier already provided by API
  getTierData: undefined,

  // Child entity configuration
  childType: 'zone',
  childApiPath: '/api/performance-tracker/deep-dive/mid/zones',
  childTierCounts: (item) => ({
    hero: item.hero_zones,
    solid: item.solid_zones,
    underperformer: item.underperformer_zones,
    remove: item.remove_zones,
    new: item.new_zones,
    lost: item.lost_zones
  }),

  // AI Insights
  aiApiPath: '/api/performance-tracker/deep-dive/mid/ai-insights',

  // No additional badges for MID
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
        label: 'Zones',
        value: item.total_zones_p2,
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
        label: 'Zone Count',
        value: item.total_zones_p2,
        formatter: (v) => formatCompactNumber(v, 0)
      }
    ]

    return <MetricsGrid metrics={metrics} columns={3} />
  }
}

/**
 * MIDAnalysisView - Media Performance Analysis
 *
 * Refactored to use EntityAnalysisView HOC with custom configuration
 */
export function MIDAnalysisView({
  data,
  loading,
  period1 = { start: '', end: '' },
  period2 = { start: '', end: '' },
  filters = {},
  onRefresh
}: MIDAnalysisViewProps) {
  return (
    <EntityAnalysisView
      config={midConfig}
      data={data}
      loading={loading}
      period1={period1}
      period2={period2}
      filters={filters}
      onRefresh={onRefresh}
    />
  )
}

export default MIDAnalysisView
