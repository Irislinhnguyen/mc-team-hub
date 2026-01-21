'use client'

import { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import EntityAnalysisView, { EntityConfig } from './EntityAnalysisView'
import SummaryMetrics, { SummaryMetricItem } from './SummaryMetrics'
import MetricsGrid, { MetricItem } from './MetricsGrid'
import { safeToFixed, formatCompactNumber } from '../../../lib/utils/formatters'
import { getGradeColor, getRiskColor } from '../../../lib/utils/colorUtils'
import { TierType } from '../../../lib/utils/tierClassification'

interface PICData {
  pic: string

  // Revenue
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number

  // Scale
  total_pids_p1: number
  total_pids_p2: number
  pid_change: number

  // Performance
  avg_fill_rate_p1: number
  avg_fill_rate_p2: number
  fill_rate_change_pct: number
  avg_ecpm_p1: number
  avg_ecpm_p2: number
  ecpm_change_pct: number

  // Scoring
  health_score: number
  health_grade?: string
  health_level: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  portfolio_score?: number
  portfolio_grade?: string
  concentration_risk?: 'Low' | 'Medium' | 'High'
  concentration_score?: number
  growth_momentum_score?: number
  growth_momentum_level?: string
  market_penetration_score?: number
  penetration_level?: string

  // Distribution
  hero_pids: number
  solid_pids: number
  underperformer_pids: number
  remove_pids: number
  new_pids?: number
  lost_pids?: number

  // Tier (computed or from API)
  tier?: TierType
}

interface PICAnalysisViewProps {
  data: PICData[]
  loading: boolean
  period1?: { start: string; end: string }
  period2?: { start: string; end: string }
  filters?: Record<string, any>
  onRefresh?: () => void
}

// PIC Configuration for EntityAnalysisView
const picConfig: EntityConfig<PICData> = {
  // Entity identification
  entityType: 'pic',
  entityKeyField: 'pic',
  entityDisplayName: (item) => item.pic,
  entitySubtitle: () => 'Portfolio Manager',

  // Tier classification (compute from metrics if not provided)
  getTierData: (item) => ({
    rev_p1: item.total_rev_p1,
    rev_p2: item.total_rev_p2,
    rev_change_pct: item.rev_change_pct,
    fill_rate: item.avg_fill_rate_p2,
    ecpm: item.avg_ecpm_p2
  }),

  // Child entity configuration
  childType: 'pid',
  childApiPath: '/api/performance-tracker/deep-dive/pic/pids',
  childTierCounts: (item) => ({
    hero: item.hero_pids,
    solid: item.solid_pids,
    underperformer: item.underperformer_pids,
    remove: item.remove_pids,
    new: item.new_pids,
    lost: item.lost_pids
  }),

  // AI Insights
  aiApiPath: '/api/performance-tracker/deep-dive/pic/ai-insights',

  // Custom badges
  renderAdditionalBadges: (item) => {
    const badges: ReactNode[] = []

    // Portfolio Grade Badge
    if (item.portfolio_grade) {
      badges.push(
        <Badge
          key="grade"
          style={{
            backgroundColor: `${getGradeColor(item.portfolio_grade)}20`,
            color: getGradeColor(item.portfolio_grade),
            border: `1px solid ${getGradeColor(item.portfolio_grade)}`
          }}
        >
          Grade: {item.portfolio_grade}
        </Badge>
      )
    }

    // Concentration Risk Badge
    if (item.concentration_risk) {
      badges.push(
        <Badge
          key="risk"
          style={{
            backgroundColor: `${getRiskColor(item.concentration_risk)}20`,
            color: getRiskColor(item.concentration_risk),
            border: `1px solid ${getRiskColor(item.concentration_risk)}`
          }}
        >
          Risk: {item.concentration_risk}
        </Badge>
      )
    }

    return <>{badges}</>
  },

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
        label: 'Publishers',
        value: item.total_pids_p2,
        formatter: (v) => formatCompactNumber(v, 0)
      },
      {
        label: 'Health Score',
        value: item.health_score,
        formatter: (v) => safeToFixed(v, 0)
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
        label: 'Growth Momentum',
        value: item.growth_momentum_level || 'N/A',
        formatter: (v) => String(v)
      }
    ]

    return <MetricsGrid metrics={metrics} columns={3} />
  }
}

/**
 * PICAnalysisView - Portfolio Manager Performance Analysis
 *
 * Refactored to use EntityAnalysisView HOC with custom configuration
 */
export function PICAnalysisView({
  data,
  loading,
  period1 = { start: '', end: '' },
  period2 = { start: '', end: '' },
  filters = {},
  onRefresh
}: PICAnalysisViewProps) {
  return (
    <EntityAnalysisView
      config={picConfig}
      data={data}
      loading={loading}
      period1={period1}
      period2={period2}
      filters={filters}
      onRefresh={onRefresh}
    />
  )
}

export default PICAnalysisView
