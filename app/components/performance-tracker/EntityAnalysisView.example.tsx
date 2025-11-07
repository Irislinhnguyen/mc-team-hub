/**
 * EntityAnalysisView - Usage Examples
 *
 * This file demonstrates how to use the EntityAnalysisView HOC
 * to replace existing AnalysisView components
 */

import EntityAnalysisView, { EntityConfig } from './EntityAnalysisView'
import SummaryMetrics, { SummaryMetricItem } from './SummaryMetrics'
import MetricsGrid, { MetricItem } from './MetricsGrid'
import { Badge } from '../../../src/components/ui/badge'
import { safeToFixed, formatCompactNumber } from '../../../lib/utils/formatters'
import { getGradeColor, getRiskColor } from '../../../lib/utils/colorUtils'

// ============================================================================
// EXAMPLE 1: PIC Analysis View
// ============================================================================

interface PICData {
  pic: string
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number
  total_pids_p1: number
  total_pids_p2: number
  avg_fill_rate_p2: number
  avg_ecpm_p2: number
  ecpm_change_pct: number
  fill_rate_change_pct: number
  portfolio_grade?: string
  concentration_risk?: string
  hero_pids: number
  solid_pids: number
  underperformer_pids: number
  remove_pids: number
}

const picConfig: EntityConfig<PICData> = {
  // Entity configuration
  entityType: 'pic',
  entityKeyField: 'pic',
  entityDisplayName: (item) => item.pic,
  entitySubtitle: () => 'Portfolio Manager',

  // Tier classification
  getTierData: (item) => ({
    rev_p1: item.total_rev_p1,
    rev_p2: item.total_rev_p2,
    rev_change_pct: item.rev_change_pct,
    fill_rate: item.avg_fill_rate_p2,
    ecpm: item.avg_ecpm_p2
  }),

  // Child entity
  childType: 'pid',
  childApiPath: '/api/performance-tracker/deep-dive/pic/pids',
  childTierCounts: (item) => ({
    hero: item.hero_pids,
    solid: item.solid_pids,
    underperformer: item.underperformer_pids,
    remove: item.remove_pids
  }),

  // AI Insights
  aiApiPath: '/api/performance-tracker/deep-dive/pic/ai-insights',

  // Render functions
  renderAdditionalBadges: (item) => (
    <>
      {item.portfolio_grade && (
        <Badge
          style={{
            backgroundColor: `${getGradeColor(item.portfolio_grade)}20`,
            color: getGradeColor(item.portfolio_grade),
            border: `1px solid ${getGradeColor(item.portfolio_grade)}`
          }}
        >
          Grade: {item.portfolio_grade}
        </Badge>
      )}
      {item.concentration_risk && (
        <Badge
          style={{
            backgroundColor: `${getRiskColor(item.concentration_risk)}20`,
            color: getRiskColor(item.concentration_risk),
            border: `1px solid ${getRiskColor(item.concentration_risk)}`
          }}
        >
          Risk: {item.concentration_risk}
        </Badge>
      )}
    </>
  ),

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
      }
    ]
    return <SummaryMetrics metrics={metrics} />
  },

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
      }
    ]
    return <MetricsGrid metrics={metrics} columns={3} />
  }
}

// Usage in component:
export function PICAnalysisViewExample({ data, loading, period1, period2, filters, onRefresh }: any) {
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

// ============================================================================
// EXAMPLE 2: Product Analysis View
// ============================================================================

interface ProductData {
  product: string
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number
  rev_share_pct: number
  total_zones_p2: number
  avg_ecpm_p2: number
  avg_fill_rate_p2: number
  ecpm_change_pct: number
  fill_rate_change_pct: number
  tier?: string
  hero_zones: number
  solid_zones: number
  underperformer_zones: number
  remove_zones: number
}

const productConfig: EntityConfig<ProductData> = {
  entityType: 'product',
  entityKeyField: 'product',
  entityDisplayName: (item) => item.product,
  entitySubtitle: () => 'Product Line',

  // Note: Product data already includes tier field from API
  getTierData: undefined, // Not needed, tier already in data

  childType: 'zone',
  childApiPath: '/api/performance-tracker/deep-dive/product/zones',
  childTierCounts: (item) => ({
    hero: item.hero_zones,
    solid: item.solid_zones,
    underperformer: item.underperformer_zones,
    remove: item.remove_zones
  }),

  aiApiPath: '/api/performance-tracker/deep-dive/product/ai-insights',

  renderAdditionalBadges: (item) => (
    <Badge variant="outline">
      Share: {safeToFixed(item.rev_share_pct, 1)}%
    </Badge>
  ),

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
      }
    ]
    return <MetricsGrid metrics={metrics} columns={2} />
  }
}

// ============================================================================
// EXAMPLE 3: Team Analysis View (Simplified)
// ============================================================================

const teamConfig: EntityConfig<any> = {
  entityType: 'team',
  entityKeyField: 'team',
  entityDisplayName: (item) => item.team,
  entitySubtitle: () => 'Team',

  getTierData: (item) => ({
    rev_p1: item.total_rev_p1,
    rev_p2: item.total_rev_p2,
    rev_change_pct: item.rev_change_pct,
    fill_rate: item.avg_fill_rate_p2,
    ecpm: item.avg_ecpm_p2
  }),

  childType: 'pic',
  childApiPath: '/api/performance-tracker/deep-dive/team/pics',
  childTierCounts: (item) => ({
    hero: item.hero_pics || 0,
    solid: item.solid_pics || 0,
    underperformer: item.underperformer_pics || 0,
    remove: item.remove_pics || 0
  }),

  aiApiPath: '/api/performance-tracker/deep-dive/team/ai-insights',

  renderAdditionalBadges: (item) => (
    <>
      {item.health_grade && (
        <Badge>Health: {item.health_grade}</Badge>
      )}
    </>
  ),

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
        value: item.total_pics
      }
    ]
    return <SummaryMetrics metrics={metrics} />
  },

  renderMetricsGrid: (item) => {
    const metrics: MetricItem[] = [
      {
        label: 'Health Score',
        value: item.health_score || 0,
        formatter: (v) => safeToFixed(v, 0)
      },
      {
        label: 'Avg Fill Rate',
        value: item.avg_fill_rate_p2,
        formatter: (v) => safeToFixed(v, 1),
        suffix: '%'
      }
    ]
    return <MetricsGrid metrics={metrics} columns={2} />
  }
}

// ============================================================================
// Benefits of EntityAnalysisView HOC:
// ============================================================================

/**
 * 1. **Massive Code Reduction**: ~1,300 lines saved across 5 files
 *
 * 2. **Consistent UX**: All entity views have identical structure
 *
 * 3. **Easy to Add New Entity Types**: Just define config, no component needed
 *
 * 4. **Centralized Bug Fixes**: Fix once, applies to all entities
 *
 * 5. **Type Safety**: Generic typing ensures compile-time safety
 *
 * 6. **Flexible Customization**: Render props allow entity-specific content
 *
 * 7. **Shared State Management**: All hooks managed centrally
 *
 * 8. **DRY Principle**: No duplication of:
 *    - Loading states
 *    - Empty states
 *    - Executive summary
 *    - Tier filtering
 *    - Drill-down logic
 *    - AI insights
 */
