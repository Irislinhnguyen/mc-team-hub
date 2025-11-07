'use client'

import { ReactNode } from 'react'
import { Badge } from '../../../src/components/ui/badge'
import EntityAnalysisView, { EntityConfig } from './EntityAnalysisView'
import SummaryMetrics, { SummaryMetricItem } from './SummaryMetrics'
import MetricsGrid, { MetricItem } from './MetricsGrid'
import { safeToFixed, formatCompactNumber } from '../../../lib/utils/formatters'
import { TierType } from '../../../lib/utils/tierClassification'
import { colors } from '../../../lib/colors'

interface ProductData {
  product: string

  // Revenue
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number
  rev_share_pct: number

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

  // Saturation & Upsell
  saturation_level?: string
  upsell_potential?: string

  // Distribution
  hero_zones: number
  solid_zones: number
  underperformer_zones: number
  remove_zones: number
  new_zones?: number
  lost_zones?: number

  // Tier (from API)
  tier?: TierType
}

interface ProductAnalysisViewProps {
  data: ProductData[]
  loading: boolean
  period1?: { start: string; end: string }
  period2?: { start: string; end: string }
  filters?: Record<string, any>
  onRefresh?: () => void
}

// Product Configuration for EntityAnalysisView
const productConfig: EntityConfig<ProductData> = {
  // Entity identification
  entityType: 'product',
  entityKeyField: 'product',
  entityDisplayName: (item) => item.product,
  entitySubtitle: () => 'Product Line',

  // Tier already provided by API, no need to compute
  getTierData: undefined,

  // Child entity configuration
  childType: 'zone',
  childApiPath: '/api/performance-tracker/deep-dive/product/zones',
  childTierCounts: (item) => ({
    hero: item.hero_zones,
    solid: item.solid_zones,
    underperformer: item.underperformer_zones,
    remove: item.remove_zones,
    new: item.new_zones,
    lost: item.lost_zones
  }),

  // AI Insights
  aiApiPath: '/api/performance-tracker/deep-dive/product/ai-insights',

  // Custom badges
  renderAdditionalBadges: (item) => {
    const badges: ReactNode[] = []

    // Revenue Share Badge
    badges.push(
      <Badge
        key="share"
        variant="outline"
        style={{
          borderColor: colors.status.info,
          color: colors.status.info
        }}
      >
        Share: {safeToFixed(item.rev_share_pct, 1)}%
      </Badge>
    )

    // Saturation Level Badge
    if (item.saturation_level) {
      badges.push(
        <Badge key="saturation" variant="outline">
          Saturation: {item.saturation_level}
        </Badge>
      )
    }

    // Upsell Potential Badge
    if (item.upsell_potential) {
      badges.push(
        <Badge key="upsell" variant="outline">
          Upsell: {item.upsell_potential}
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
        label: 'Revenue Share',
        value: item.rev_share_pct,
        formatter: (v) => safeToFixed(v, 1),
        suffix: '%'
      }
    ]

    return <MetricsGrid metrics={metrics} columns={3} />
  }
}

/**
 * ProductAnalysisView - Product Line Performance Analysis
 *
 * Refactored to use EntityAnalysisView HOC with custom configuration
 */
export function ProductAnalysisView({
  data,
  loading,
  period1 = { start: '', end: '' },
  period2 = { start: '', end: '' },
  filters = {},
  onRefresh
}: ProductAnalysisViewProps) {
  return (
    <EntityAnalysisView
      config={productConfig}
      data={data}
      loading={loading}
      period1={period1}
      period2={period2}
      filters={filters}
      onRefresh={onRefresh}
    />
  )
}

export default ProductAnalysisView
