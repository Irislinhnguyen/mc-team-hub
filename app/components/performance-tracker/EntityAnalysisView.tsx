/**
 * EntityAnalysisView - Higher-Order Component
 * Generic component for displaying hierarchical entity analysis with drill-down capabilities
 *
 * This HOC abstracts the common structure of all AnalysisView components:
 * - Executive Summary
 * - Tier Filter Badges
 * - Expandable Cards with metrics
 * - Drill-down to child entities
 * - AI Insights
 */

'use client'

import { useState, ReactNode } from 'react'
import { SubtleSkeleton } from './SubtleSkeleton'
import ExecutiveSummary from './ExecutiveSummary'
import TierFilterBadges from './TierFilterBadges'
import ExpandableCard from './ExpandableCard'
import ChildDetailsTable, { ChildMetric } from './ChildDetailsTable'
import { TierType, getTierInfo } from '../../../lib/utils/tierClassification'
import { useTierFiltering } from '../../../lib/hooks/useTierFiltering'
import { useAIInsights } from '../../../lib/hooks/useAIInsights'
import { useDrillDown } from '../../../lib/hooks/useDrillDown'

interface Period {
  start: string
  end: string
}

export interface EntityConfig<TData> {
  // Entity identification
  entityType: 'pic' | 'team' | 'product' | 'pid' | 'mid'
  entityKeyField: keyof TData // e.g., 'pic', 'team', 'product'
  entityDisplayName: (item: TData) => string
  entitySubtitle?: (item: TData) => string

  // Tier classification (if data doesn't include tier field)
  getTierData?: (item: TData) => {
    rev_p1: number
    rev_p2: number
    rev_change_pct: number
    fill_rate: number
    ecpm: number
  }

  // Child entity configuration
  childType: 'pid' | 'pic' | 'zone' | 'mid'
  childApiPath: string
  childTierCounts: (item: TData) => {
    hero: number
    solid: number
    underperformer: number
    remove: number
    new?: number
    lost?: number
  }

  // AI Insights
  aiApiPath: string

  // Render functions for custom content
  renderAdditionalBadges?: (item: TData, tierInfo: ReturnType<typeof getTierInfo>) => ReactNode
  renderSummaryMetrics: (item: TData) => ReactNode
  renderMetricsGrid: (item: TData) => ReactNode
  renderDetailTabs?: (item: TData) => ReactNode
  renderPortfolioMetrics?: (data: TData[], filteredData: TData[]) => ReactNode
}

export interface EntityAnalysisViewProps<TData> {
  config: EntityConfig<TData>
  data: TData[]
  loading: boolean
  period1: Period
  period2: Period
  filters: Record<string, any>
  onRefresh?: () => void
}

/**
 * EntityAnalysisView - Generic hierarchical entity view
 *
 * Handles all common functionality:
 * - Loading/empty states
 * - Tier classification and filtering
 * - Expandable cards
 * - Child entity drill-down
 * - AI insights
 *
 * Custom rendering via config.render* functions
 */
export default function EntityAnalysisView<TData extends Record<string, any>>({
  config,
  data,
  loading,
  period1,
  period2,
  filters,
  onRefresh
}: EntityAnalysisViewProps<TData>) {
  // Expandable card state
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null)

  // Tier filtering for parent entities
  const {
    itemsWithTiers,
    tierCounts,
    filteredData,
    selectedTier: activeTier,
    setSelectedTier: setActiveTier
  } = useTierFiltering(data as any)

  // AI Insights for executive summary
  const {
    insights: aiInsights,
    loading: aiLoading,
    refresh: refreshAI
  } = useAIInsights({
    apiPath: config.aiApiPath,
    data,
    context: { period1, period2, filters }
  })

  // Drill-down to child entities
  const {
    selectedTier: childSelectedTier,
    childData,
    loadingChildren,
    loadChildren,
    handleTierSelect: handleChildTierSelect
  } = useDrillDown<ChildMetric>({
    apiPath: config.childApiPath,
    period1,
    period2,
    filters,
    entityIdField: String(config.entityKeyField)
  })

  // Toggle expand/collapse
  const toggleExpand = (entityId: string) => {
    if (expandedEntity === entityId) {
      setExpandedEntity(null)
    } else {
      setExpandedEntity(entityId)
      // Load children if not already loaded
      if (!childData[entityId]) {
        loadChildren(entityId, null)
      }
    }
  }

  // Loading state
  if (loading) {
    return <SubtleSkeleton type="text" rows={5} />
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No {config.entityType} data available. Please adjust filters and try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <ExecutiveSummary
        data={data}
        level={config.entityType}
        period1={period1}
        period2={period2}
        onRefreshAI={refreshAI}
        aiInsights={aiInsights}
        loadingAI={aiLoading}
      />

      {/* Portfolio Metrics (optional) */}
      {config.renderPortfolioMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {config.renderPortfolioMetrics(data, filteredData as any)}
        </div>
      )}

      {/* Tier Filter Badges */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {config.entityType.toUpperCase()} Performance Tiers
        </h3>
        <TierFilterBadges
          tiers={tierCounts}
          activeTier={activeTier}
          onSelectTier={setActiveTier}
        />
      </div>

      {/* Entity Cards */}
      {filteredData.map((item) => {
        const entityId = String((item as any)[config.entityKeyField])
        const isExpanded = expandedEntity === entityId

        // Get tier info
        const itemTier = (item as any).tier as TierType
        const tierInfo = getTierInfo(itemTier)

        // Get child tier counts
        const childTiers = config.childTierCounts(item as any)

        const itemAny = item as any
        return (
          <ExpandableCard
            key={entityId}
            id={entityId}
            isExpanded={isExpanded}
            onToggle={() => toggleExpand(entityId)}
            title={config.entityDisplayName(itemAny)}
            subtitle={config.entitySubtitle?.(itemAny)}
            tierInfo={tierInfo}
            additionalBadges={config.renderAdditionalBadges?.(itemAny, tierInfo)}
            summaryMetrics={config.renderSummaryMetrics(itemAny)}
          >
            {/* Metrics Grid */}
            {config.renderMetricsGrid(itemAny)}

            {/* Child Tier Breakdown */}
            <div className="space-y-3 mt-4">
              <h4 className="text-sm font-semibold text-gray-700">
                {config.childType.toUpperCase()} Performance Tiers
              </h4>

              <TierFilterBadges
                tiers={childTiers as any}
                activeTier={childSelectedTier[entityId] || null}
                onSelectTier={(tier) => handleChildTierSelect(entityId, tier)}
              />

              <ChildDetailsTable
                level={config.childType}
                data={childData[entityId] || []}
                tier={childSelectedTier[entityId] || null}
                loading={loadingChildren[entityId]}
              />
            </div>

            {/* Optional: Additional Detail Tabs */}
            {config.renderDetailTabs?.(itemAny)}
          </ExpandableCard>
        )
      })}
    </div>
  )
}
