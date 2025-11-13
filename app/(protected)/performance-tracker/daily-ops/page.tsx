'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MetricCard } from '../../../components/performance-tracker/MetricCard'
import MetricCardSkeleton from '../../../components/performance-tracker/skeletons/MetricCardSkeleton'
import { LazyDataTable } from '../../../components/performance-tracker/LazyDataTable'
import { LazyDataTableSkeleton } from '../../../components/performance-tracker/skeletons/LazyDataTableSkeleton'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { useDailyOps } from '../../../../lib/hooks/queries/useDailyOps'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'

/**
 * REFACTORED VERSION - Daily Ops Report Page
 *
 * Changes from original:
 * - Uses AnalyticsPageLayout for consistent structure
 * - Uses MetadataFilterPanel (eliminates ~80 lines of metadata handling)
 * - Uses React Query for caching (useDailyOps hook)
 * - Added export functionality (contentRef)
 * - Added proper loading skeletons for metrics
 * - Extended metadata API to include rev_flag filter
 * - Filter persistence via localStorage
 * - Cleaner, more maintainable code
 *
 * Cross-filter logic: KEPT AS-IS (not refactored per plan)
 */

interface DailyOpsData {
  metrics: {
    yesterday_revenue: number
    yesterday_profit: number
    ecpm: number
    yesterday_requests: number
    yesterday_serve: number
    active_clients: number
  }
}

export default function DailyOpsPageRefactored() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const { crossFilters } = useCrossFilter()

  // Stabilize setCurrentFilters to prevent infinite loops
  const stableSetCurrentFilters = useCallback((filters: Record<string, any>) => {
    setCurrentFilters(filters)
  }, [])

  // Use React Query hook for data fetching and caching
  const { data: rawData, isLoading: loading, error } = useDailyOps(currentFilters)

  // Apply client-side filtering for cross-filters (instant, no API call)
  const { filteredData: filteredTopMovers } = useClientSideFilterMulti(
    rawData?.topMovers,
    crossFilters
  )
  const { filteredData: filteredTopMoversDetails } = useClientSideFilterMulti(
    rawData?.topMoversDetails,
    crossFilters
  )

  // Combine filtered data
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      metrics: rawData.metrics,
      topMovers: filteredTopMovers,
      topMoversDetails: filteredTopMoversDetails,
    }
  }, [filteredTopMovers, filteredTopMoversDetails, rawData])

  // Column configurations for skeletons
  const topMoversColumns = [
    { key: 'pic', label: 'pic' },
    { key: 'zonename', label: 'zonename' },
    { key: 'req_flag', label: 'req_flag' },
    { key: 'paid_flag', label: 'paid_flag' },
    { key: 'cpm_flag', label: 'cpm_flag' },
    { key: 'rev_flag', label: 'rev_flag' },
  ]

  const topMoversDetailsColumns = [
    { key: 'zid', label: 'zid' },
    { key: 'zonename', label: 'zonename' },
    { key: 'req_7d_avg', label: 'req_7d_avg' },
    { key: 'req_yesterday', label: 'req_yesterday' },
    { key: 'paid_7d_avg', label: 'paid_7d_avg' },
    { key: 'paid_yesterday', label: 'paid_yesterday' },
    { key: 'cpm_7d_avg', label: 'cpm_7d_avg' },
    { key: 'cpm_yesterday', label: 'cpm_yesterday' },
    { key: 'rev_7d_avg', label: 'rev_7d_avg' },
    { key: 'rev_yesterday', label: 'rev_yesterday' },
  ]

  return (
    <AnalyticsPageLayout title="Daily Ops Report (CS)" showExport={true} contentRef={contentRef}>
      {/* Filter Panel with integrated metadata handling */}
      <MetadataFilterPanel
        page="daily-ops"
        filterFields={['team', 'pic', 'rev_flag']}
        onFilterChange={stableSetCurrentFilters}
        isLoading={loading}
      />

      {/* Metrics Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <MetricCard
            label="Yesterday Revenue"
            value={data.metrics.yesterday_revenue || 0}
          />
          <MetricCard
            label="Yesterday Profit"
            value={data.metrics.yesterday_profit || 0}
          />
          <MetricCard
            label="ecpm"
            value={data.metrics.ecpm || 0}
          />
          <MetricCard
            label="Yesterday request"
            value={data.metrics.yesterday_requests || 0}
          />
          <MetricCard
            label="Yesterday serve"
            value={data.metrics.yesterday_serve || 0}
          />
          <MetricCard
            label="Yesterday active client"
            value={data.metrics.active_clients || 0}
          />
        </div>
      ) : null}

      {/* Top Movers Table - Client-side filtered */}
      {loading && !data ? (
        <LazyDataTableSkeleton columns={topMoversColumns} rows={10} />
      ) : data?.topMovers ? (
        <LazyDataTable
          title="Top movers"
          columns={topMoversColumns}
          data={data.topMovers}
          crossFilterColumns={['pic', 'zonename']}
        />
      ) : null}

      {/* Top Movers - Details Table - Client-side filtered */}
      {loading && !data ? (
        <LazyDataTableSkeleton columns={topMoversDetailsColumns} rows={10} />
      ) : data?.topMoversDetails ? (
        <LazyDataTable
          title="Top movers - Details"
          columns={topMoversDetailsColumns}
          data={data.topMoversDetails}
          crossFilterColumns={['zid', 'zonename']}
        />
      ) : null}
    </AnalyticsPageLayout>
  )
}
