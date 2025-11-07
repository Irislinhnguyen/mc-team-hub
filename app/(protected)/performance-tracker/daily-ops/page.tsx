'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MetricCard } from '../../../components/performance-tracker/MetricCard'
import MetricCardSkeleton from '../../../components/performance-tracker/skeletons/MetricCardSkeleton'
import { LazyDataTable } from '../../../components/performance-tracker/LazyDataTable'
import TableSkeleton from '../../../components/performance-tracker/skeletons/TableSkeleton'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { fetchAnalyticsData } from '../../../../lib/api/analytics'

/**
 * REFACTORED VERSION - Daily Ops Report Page
 *
 * Changes from original:
 * - Uses AnalyticsPageLayout for consistent structure
 * - Uses MetadataFilterPanel (eliminates ~80 lines of metadata handling)
 * - Uses fetchAnalyticsData API helper
 * - Added export functionality (contentRef)
 * - Added proper loading skeletons for metrics
 * - Extended metadata API to include rev_flag filter
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
  const [loading, setLoading] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const [data, setData] = useState<DailyOpsData | null>(null)
  const [shouldLoadTables, setShouldLoadTables] = useState(false)

  // Lazy loading state for tables
  const [topMoversData, setTopMoversData] = useState<any[]>([])
  const [topMoversTotal, setTopMoversTotal] = useState(0)
  const [topMoversLoading, setTopMoversLoading] = useState(false)
  const [topMoversOffset, setTopMoversOffset] = useState(0)

  const [topMoversDetailsData, setTopMoversDetailsData] = useState<any[]>([])
  const [topMoversDetailsTotal, setTopMoversDetailsTotal] = useState(0)
  const [topMoversDetailsLoading, setTopMoversDetailsLoading] = useState(false)
  const [topMoversDetailsOffset, setTopMoversDetailsOffset] = useState(0)

  // Cross-filter integration (kept as-is from original)
  const { crossFilters } = useCrossFilter()
  const prevCrossFilterFieldsRef = useRef<string[]>([])

  useEffect(() => {
    setCurrentFilters(prev => {
      const cleaned = { ...prev }
      prevCrossFilterFieldsRef.current.forEach(field => {
        delete cleaned[field]
      })

      // Group cross-filters by field to support multiple values
      const newCrossFilterValues = crossFilters.reduce((acc, filter) => {
        if (acc[filter.field]) {
          // Field already exists - convert to array or append to existing array
          if (Array.isArray(acc[filter.field])) {
            acc[filter.field].push(filter.value)
          } else {
            acc[filter.field] = [acc[filter.field], filter.value]
          }
        } else {
          // First value for this field
          acc[filter.field] = filter.value
        }
        return acc
      }, {} as Record<string, any>)

      prevCrossFilterFieldsRef.current = crossFilters.map(f => f.field)

      return { ...cleaned, ...newCrossFilterValues }
    })
  }, [crossFilters])

  // Lazy loading function for Top Movers
  const loadTopMoversBatch = useCallback(async (offset: number) => {
    setTopMoversLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/daily-ops-paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType: 'topMovers',
          offset,
          limit: 500
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch top movers data')
      const result = await response.json()

      if (result.status === 'success') {
        setTopMoversData(prev => offset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setTopMoversTotal(result.data.totalCount)
        setTopMoversOffset(offset + result.data.rows.length)
      }
    } catch (error) {
      console.error('Error loading top movers:', error)
    } finally {
      setTopMoversLoading(false)
    }
  }, [currentFilters])

  const loadMoreTopMovers = useCallback(async () => {
    if (topMoversOffset < topMoversTotal) {
      await loadTopMoversBatch(topMoversOffset)
    }
  }, [topMoversOffset, topMoversTotal, loadTopMoversBatch])

  // Lazy loading function for Top Movers Details
  const loadTopMoversDetailsBatch = useCallback(async (offset: number) => {
    setTopMoversDetailsLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/daily-ops-paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType: 'topMoversDetails',
          offset,
          limit: 500
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch top movers details data')
      const result = await response.json()

      if (result.status === 'success') {
        setTopMoversDetailsData(prev => offset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setTopMoversDetailsTotal(result.data.totalCount)
        setTopMoversDetailsOffset(offset + result.data.rows.length)
      }
    } catch (error) {
      console.error('Error loading top movers details:', error)
    } finally {
      setTopMoversDetailsLoading(false)
    }
  }, [currentFilters])

  const loadMoreTopMoversDetails = useCallback(async () => {
    if (topMoversDetailsOffset < topMoversDetailsTotal) {
      await loadTopMoversDetailsBatch(topMoversDetailsOffset)
    }
  }, [topMoversDetailsOffset, topMoversDetailsTotal, loadTopMoversDetailsBatch])

  // Fetch data when filters change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Reset lazy loading state
        setTopMoversData([])
        setTopMoversOffset(0)
        setTopMoversDetailsData([])
        setTopMoversDetailsOffset(0)

        const result = await fetchAnalyticsData<DailyOpsData>(
          '/api/performance-tracker/daily-ops',
          currentFilters
        )
        setData(result)

        // Enable table loading after main data is loaded
        setShouldLoadTables(true)
      } catch (error) {
        console.error('Error fetching daily ops data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentFilters, loadTopMoversBatch, loadTopMoversDetailsBatch])

  // Load tables when data is ready
  useEffect(() => {
    if (shouldLoadTables && data) {
      setTimeout(() => {
        loadTopMoversBatch(0)
        loadTopMoversDetailsBatch(0)
      }, 100)
      setShouldLoadTables(false) // Reset flag
    }
  }, [shouldLoadTables, data, loadTopMoversBatch, loadTopMoversDetailsBatch])

  return (
    <AnalyticsPageLayout title="Daily Ops Report (CS)" showExport={true} contentRef={contentRef}>
      {/* Filter Panel with integrated metadata handling */}
      <MetadataFilterPanel
        page="daily-ops"
        filterFields={['team', 'pic', 'rev_flag']}
        onFilterChange={setCurrentFilters}
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

      {/* Top Movers Table with Lazy Loading */}
      {loading && !data ? (
        <TableSkeleton rows={10} />
      ) : (
        <LazyDataTable
          title="Top movers"
          columns={[
            { key: 'pic', label: 'pic' },
            { key: 'zonename', label: 'zonename' },
            { key: 'req_flag', label: 'req_flag' },
            { key: 'paid_flag', label: 'paid_flag' },
            { key: 'cpm_flag', label: 'cpm_flag' },
            { key: 'rev_flag', label: 'rev_flag' },
          ]}
          data={topMoversData}
          crossFilterColumns={['pic', 'zonename']}
          onLoadMore={loadMoreTopMovers}
          hasMore={topMoversOffset < topMoversTotal}
          isLoading={topMoversLoading}
          totalCount={topMoversTotal}
        />
      )}

      {/* Top Movers - Details Table with Lazy Loading */}
      {loading && !data ? (
        <TableSkeleton rows={10} />
      ) : (
        <LazyDataTable
          title="Top movers - Details"
          columns={[
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
          ]}
          data={topMoversDetailsData}
          crossFilterColumns={['zid', 'zonename']}
          onLoadMore={loadMoreTopMoversDetails}
          hasMore={topMoversDetailsOffset < topMoversDetailsTotal}
          isLoading={topMoversDetailsLoading}
          totalCount={topMoversDetailsTotal}
        />
      )}
    </AnalyticsPageLayout>
  )
}
