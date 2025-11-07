'use client'

import { ReactNode } from 'react'
import { Badge } from '../../../src/components/ui/badge'
import EntityAnalysisView, { EntityConfig } from './EntityAnalysisView'
import SummaryMetrics, { SummaryMetricItem } from './SummaryMetrics'
import MetricsGrid, { MetricItem } from './MetricsGrid'
import { safeToFixed, formatCompactNumber } from '../../../lib/utils/formatters'
import { getGradeColor, getHealthColor } from '../../../lib/utils/colorUtils'
import { TierType } from '../../../lib/utils/tierClassification'

interface TeamData {
  team: string

  // Revenue
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number

  // Scale
  total_pics: number
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
  health_level: string
  growth_momentum_level: string
  penetration_level: string

  // Distribution (6-tier system)
  hero_pics: number
  solid_pics: number
  underperformer_pics: number
  remove_pics: number
  new_pics: number
  lost_pics: number

  // Tier (computed or from API)
  tier?: TierType
}

interface TeamAnalysisViewProps {
  data: TeamData[]
  loading: boolean
  period1?: { start: string; end: string }
  period2?: { start: string; end: string }
  filters?: Record<string, any>
  onRefresh?: () => void
}

// Team Configuration for EntityAnalysisView
const teamConfig: EntityConfig<TeamData> = {
  // Entity identification
  entityType: 'team',
  entityKeyField: 'team',
  entityDisplayName: (item) => item.team,
  entitySubtitle: () => 'Team',

  // Tier classification
  getTierData: (item) => ({
    rev_p1: item.total_rev_p1,
    rev_p2: item.total_rev_p2,
    rev_change_pct: item.rev_change_pct,
    fill_rate: item.avg_fill_rate_p2,
    ecpm: item.avg_ecpm_p2
  }),

  // Child entity configuration
  childType: 'pic',
  childApiPath: '/api/performance-tracker/deep-dive/team/pics',
  childTierCounts: (item) => ({
    hero: item.hero_pics,
    solid: item.solid_pics,
    underperformer: item.underperformer_pics,
    remove: item.remove_pics,
    new: item.new_pics,
    lost: item.lost_pics
  }),

  // AI Insights
  aiApiPath: '/api/performance-tracker/deep-dive/team/ai-insights',

  // Custom badges
  renderAdditionalBadges: (item) => {
    const badges: ReactNode[] = []

    // Health Grade Badge
    if (item.health_grade) {
      badges.push(
        <Badge
          key="grade"
          style={{
            backgroundColor: `${getGradeColor(item.health_grade)}20`,
            color: getGradeColor(item.health_grade),
            border: `1px solid ${getGradeColor(item.health_grade)}`
          }}
        >
          Health: {item.health_grade}
        </Badge>
      )
    }

    // Health Level Badge
    if (item.health_level) {
      badges.push(
        <Badge
          key="health"
          style={{
            backgroundColor: `${getHealthColor(item.health_level)}20`,
            color: getHealthColor(item.health_level),
            border: `1px solid ${getHealthColor(item.health_level)}`
          }}
        >
          {item.health_level}
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
        label: 'PICs',
        value: item.total_pics,
        formatter: (v) => formatCompactNumber(v, 0)
      },
      {
        label: 'Publishers',
        value: item.total_pids_p2,
        formatter: (v) => formatCompactNumber(v, 0)
      }
    ]

    return <SummaryMetrics metrics={metrics} />
  },

  // Metrics grid in expanded content
  renderMetricsGrid: (item) => {
    const metrics: MetricItem[] = [
      {
        label: 'Health Score',
        value: item.health_score,
        formatter: (v) => safeToFixed(v, 0)
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
 * TeamAnalysisView - Team Performance Analysis
 *
 * Refactored to use EntityAnalysisView HOC with custom configuration
 */
export function TeamAnalysisView({
  data,
  loading,
  period1 = { start: '', end: '' },
  period2 = { start: '', end: '' },
  filters = {},
  onRefresh
}: TeamAnalysisViewProps) {
  return (
    <EntityAnalysisView
      config={teamConfig}
      data={data}
      loading={loading}
      period1={period1}
      period2={period2}
      filters={filters}
      onRefresh={onRefresh}
    />
  )
}

export default TeamAnalysisView
