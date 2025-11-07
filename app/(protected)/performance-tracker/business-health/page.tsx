'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MetricCard } from '../../../components/performance-tracker/MetricCard'
import { TimeSeriesChart } from '../../../components/performance-tracker/TimeSeriesChart'
import { BarChartComponent } from '../../../components/performance-tracker/BarChart'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { LazyDataTable } from '../../../components/performance-tracker/LazyDataTable'
import MetricCardSkeleton from '../../../components/performance-tracker/skeletons/MetricCardSkeleton'
import ChartSkeleton from '../../../components/performance-tracker/skeletons/ChartSkeleton'
import TableSkeleton from '../../../components/performance-tracker/skeletons/TableSkeleton'
import { colors } from '../../../../lib/colors'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { ToggleGroup, ToggleGroupItem } from '../../../../src/components/ui/toggle-group'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useDefaultDateRange } from '../../../../lib/hooks/useDefaultDateRange'
import { safeToFixed, safeNumber } from '../../../../lib/utils/formatters'

/**
 * REFACTORED VERSION - Business Health Dashboard
 *
 * Changes from original:
 * - Uses AnalyticsPageLayout for consistent structure
 * - Uses MetadataFilterPanel (eliminates ~80 lines of metadata handling)
 * - Simplified filter configuration using shared abstractions
 * - Added export functionality (contentRef)
 * - Proper loading skeletons for all sections
 * - Cleaner, more maintainable code
 *
 * Cross-filter logic: KEPT AS-IS (not refactored per plan)
 * Lazy loading logic: KEPT AS-IS (complex pagination requirements)
 */

function BusinessHealthPageContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const defaultDateRange = useDefaultDateRange(30) // Last 30 days
  const searchParams = useSearchParams()
  const presetIdFromUrl = searchParams.get('preset')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>(defaultDateRange)

  // Stabilize setCurrentFilters to prevent infinite re-render loops in child components
  const stableSetCurrentFilters = useCallback((filters: Record<string, any>) => {
    setCurrentFilters(filters)
  }, [])

  const { crossFilters } = useCrossFilter()
  const prevCrossFilterFieldsRef = useRef<string[]>([])
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'profit' | 'requests' | 'paid' | 'ecpm' | 'fill_rate'>('revenue')

  // Lazy loading state for large tables
  const [zoneMonitoringData, setZoneMonitoringData] = useState<any[]>([])
  const [zoneMonitoringTotal, setZoneMonitoringTotal] = useState(0)
  const [zoneMonitoringLoading, setZoneMonitoringLoading] = useState(false)
  const [zoneMonitoringOffset, setZoneMonitoringOffset] = useState(0)

  const [listOfPidData, setListOfPidData] = useState<any[]>([])
  const [listOfPidTotal, setListOfPidTotal] = useState(0)
  const [listOfPidLoading, setListOfPidLoading] = useState(false)
  const [listOfPidOffset, setListOfPidOffset] = useState(0)

  const [listOfPidByDateData, setListOfPidByDateData] = useState<any[]>([])
  const [listOfPidByDateTotal, setListOfPidByDateTotal] = useState(0)
  const [listOfPidByDateLoading, setListOfPidByDateLoading] = useState(false)
  const [listOfPidByDateOffset, setListOfPidByDateOffset] = useState(0)

  const [listOfMidData, setListOfMidData] = useState<any[]>([])
  const [listOfMidTotal, setListOfMidTotal] = useState(0)
  const [listOfMidLoading, setListOfMidLoading] = useState(false)
  const [listOfMidOffset, setListOfMidOffset] = useState(0)

  const [listOfMidByDateData, setListOfMidByDateData] = useState<any[]>([])
  const [listOfMidByDateTotal, setListOfMidByDateTotal] = useState(0)
  const [listOfMidByDateLoading, setListOfMidByDateLoading] = useState(false)
  const [listOfMidByDateOffset, setListOfMidByDateOffset] = useState(0)

  // Apply cross-filters to current filters whenever they change
  useEffect(() => {
    setCurrentFilters(prev => {
      // Remove old cross-filter keys
      const cleaned = { ...prev }
      prevCrossFilterFieldsRef.current.forEach(field => {
        delete cleaned[field]
      })

      // Apply new cross-filters - group by field to support multiple values
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

      // Update ref with current fields
      prevCrossFilterFieldsRef.current = crossFilters.map(f => f.field)

      // Merge cleaned filters with new cross-filters
      return { ...cleaned, ...newCrossFilterValues }
    })
  }, [crossFilters])

  // Phase 1: Fetch metrics and charts (fast queries)
  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/business-health-filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentFilters),
      })

      if (!response.ok) throw new Error('Failed to fetch data')
      const result = await response.json()
      setData(result.data)

      // Phase 2: Start loading large tables after main data loads
      setTimeout(() => {
        loadZoneMonitoringBatch(0)
        loadListOfPidBatch(0)
        loadListOfPidByDateBatch(0)
        loadListOfMidBatch(0)
        loadListOfMidByDateBatch(0)
      }, 100)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Lazy loading functions for zone monitoring
  const loadZoneMonitoringBatch = useCallback(async (offset: number) => {
    setZoneMonitoringLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/business-health-paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType: 'zoneMonitoringTimeSeries',
          offset,
          limit: 500
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch zone monitoring data')
      const result = await response.json()

      if (result.status === 'success') {
        setZoneMonitoringData(prev => offset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setZoneMonitoringTotal(result.data.totalCount)
        setZoneMonitoringOffset(offset + result.data.rows.length)
      }
    } catch (error) {
      console.error('Error loading zone monitoring:', error)
    } finally {
      setZoneMonitoringLoading(false)
    }
  }, [currentFilters])

  const loadMoreZoneMonitoring = useCallback(async () => {
    if (zoneMonitoringOffset < zoneMonitoringTotal) {
      await loadZoneMonitoringBatch(zoneMonitoringOffset)
    }
  }, [zoneMonitoringOffset, zoneMonitoringTotal, loadZoneMonitoringBatch])

  // Lazy loading functions for list of PID
  const loadListOfPidBatch = useCallback(async (offset: number) => {
    setListOfPidLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/business-health-paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType: 'listOfPid',
          offset,
          limit: 500
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch list of PID data')
      const result = await response.json()

      if (result.status === 'success') {
        setListOfPidData(prev => offset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setListOfPidTotal(result.data.totalCount)
        setListOfPidOffset(offset + result.data.rows.length)
      }
    } catch (error) {
      console.error('Error loading list of PID:', error)
    } finally {
      setListOfPidLoading(false)
    }
  }, [currentFilters])

  const loadMoreListOfPid = useCallback(async () => {
    if (listOfPidOffset < listOfPidTotal) {
      await loadListOfPidBatch(listOfPidOffset)
    }
  }, [listOfPidOffset, listOfPidTotal, loadListOfPidBatch])

  // Lazy loading functions for list of PID by date
  const loadListOfPidByDateBatch = useCallback(async (offset: number) => {
    setListOfPidByDateLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/business-health-paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType: 'listOfPidByDate',
          offset,
          limit: 500
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch list of PID by date data')
      const result = await response.json()

      if (result.status === 'success') {
        setListOfPidByDateData(prev => offset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setListOfPidByDateTotal(result.data.totalCount)
        setListOfPidByDateOffset(offset + result.data.rows.length)
      }
    } catch (error) {
      console.error('Error loading list of PID by date:', error)
    } finally {
      setListOfPidByDateLoading(false)
    }
  }, [currentFilters])

  const loadMoreListOfPidByDate = useCallback(async () => {
    if (listOfPidByDateOffset < listOfPidByDateTotal) {
      await loadListOfPidByDateBatch(listOfPidByDateOffset)
    }
  }, [listOfPidByDateOffset, listOfPidByDateTotal, loadListOfPidByDateBatch])

  // Lazy loading functions for list of MID
  const loadListOfMidBatch = useCallback(async (offset: number) => {
    setListOfMidLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/business-health-paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType: 'listOfMid',
          offset,
          limit: 500
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch list of MID data')
      const result = await response.json()

      if (result.status === 'success') {
        setListOfMidData(prev => offset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setListOfMidTotal(result.data.totalCount)
        setListOfMidOffset(offset + result.data.rows.length)
      }
    } catch (error) {
      console.error('Error loading list of MID:', error)
    } finally {
      setListOfMidLoading(false)
    }
  }, [currentFilters])

  const loadMoreListOfMid = useCallback(async () => {
    if (listOfMidOffset < listOfMidTotal) {
      await loadListOfMidBatch(listOfMidOffset)
    }
  }, [listOfMidOffset, listOfMidTotal, loadListOfMidBatch])

  // Lazy loading functions for list of MID by date
  const loadListOfMidByDateBatch = useCallback(async (offset: number) => {
    setListOfMidByDateLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/business-health-paginated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType: 'listOfMidByDate',
          offset,
          limit: 500
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch list of MID by date data')
      const result = await response.json()

      if (result.status === 'success') {
        setListOfMidByDateData(prev => offset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setListOfMidByDateTotal(result.data.totalCount)
        setListOfMidByDateOffset(offset + result.data.rows.length)
      }
    } catch (error) {
      console.error('Error loading list of MID by date:', error)
    } finally {
      setListOfMidByDateLoading(false)
    }
  }, [currentFilters])

  const loadMoreListOfMidByDate = useCallback(async () => {
    if (listOfMidByDateOffset < listOfMidByDateTotal) {
      await loadListOfMidByDateBatch(listOfMidByDateOffset)
    }
  }, [listOfMidByDateOffset, listOfMidByDateTotal, loadListOfMidByDateBatch])

  // Fetch data when filters change
  useEffect(() => {
    // Prevent fetch while already loading to avoid race conditions
    if (loading) return

    // Reset lazy loading state
    setZoneMonitoringData([])
    setZoneMonitoringOffset(0)
    setListOfPidData([])
    setListOfPidOffset(0)
    setListOfPidByDateData([])
    setListOfPidByDateOffset(0)
    setListOfMidData([])
    setListOfMidOffset(0)
    setListOfMidByDateData([])
    setListOfMidByDateOffset(0)

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters])

  const metrics = data?.metrics || {}

  // Format time series data - preserve raw date for filtering (MEMOIZED)
  const timeSeries = useMemo(() => {
    return (data?.timeSeries || []).map((d: any) => {
      const rawDate = d.date.value || d.date
      return {
        date: new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rawDate: rawDate, // Keep ISO format for cross-filtering
        revenue: parseFloat(d.revenue) || 0,
        profit: parseFloat(d.profit) || 0,
      }
    })
  }, [data?.timeSeries])

  // Format product trend data - group by product and date, preserve raw dates (MEMOIZED)
  const productTrendData = useMemo(() => {
    const productTrendRaw = data?.productTrend || []
    const productTrendMap = new Map<string, Record<string, any>>()
    productTrendRaw.forEach((d: any) => {
      const rawDate = d.date.value || d.date
      const dateStr = new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!productTrendMap.has(dateStr)) {
        productTrendMap.set(dateStr, { date: dateStr, rawDate: rawDate })
      }
      const row = productTrendMap.get(dateStr)!
      // Store all metrics for each product
      row[`${d.product}_profit`] = parseFloat(d.profit) || 0
      row[`${d.product}_revenue`] = parseFloat(d.revenue) || 0
      row[`${d.product}_ecpm`] = parseFloat(d.ecpm) || 0
      row[`${d.product}_requests`] = parseInt(d.requests) || 0
      row[`${d.product}_paid`] = parseInt(d.paid) || 0
    })
    return Array.from(productTrendMap.values()).sort((a, b) => {
      return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
    })
  }, [data?.productTrend])

  // Get raw product trend for line generation (MEMOIZED)
  const productTrendRaw = useMemo(() => data?.productTrend || [], [data?.productTrend])

  // Format product trend data with fill rate calculation (MEMOIZED)
  const productTrendDataWithFillRate = useMemo(() => {
    return productTrendData.map(row => {
      const newRow = { ...row }
      // Calculate fill rate for each product (multiply by 100 for percentage display)
      Array.from(new Set(productTrendRaw.map((d: any) => d.product))).forEach((product: any) => {
        const requests = row[`${product}_requests`] || 0
        const paid = row[`${product}_paid`] || 0
        newRow[`${product}_fill_rate`] = requests > 0 ? ((paid / requests) * 100) : 0
      })
      return newRow
    })
  }, [productTrendData, productTrendRaw])

  // Format zone monitoring time series - use lazy-loaded data (MEMOIZED)
  const zoneMonitoringTimeSeries = useMemo(() => {
    return zoneMonitoringData.map((d: any) => {
      const rawDate = d.date.value || d.date
      return {
        date: new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rawDate: rawDate, // Keep ISO format for cross-filtering
        zid: parseInt(d.zid) || 0,
        zonename: d.zonename || '',
        product: d.product || '',
        req: parseInt(d.req) || 0,
        fill_rate: parseFloat(d.fill_rate) || 0,
        request_CPM: parseFloat(d.request_CPM) || 0,
        rev: parseFloat(d.rev) || 0,
        profit: parseFloat(d.profit) || 0,
      }
    })
  }, [zoneMonitoringData])

  return (
    <AnalyticsPageLayout title="Business Health Dashboard" showExport={true} contentRef={contentRef}>
      {/* Filter Panel with integrated metadata handling and preset manager */}
      <MetadataFilterPanel
        page="business-health"
        filterFields={['daterange', 'team', 'pic', 'h5', 'product', 'pid', 'mid', 'pubname', 'medianame', 'zid', 'zonename']}
        onFilterChange={stableSetCurrentFilters}
        isLoading={loading}
        defaultDateRange={defaultDateRange}
        presetIdFromUrl={presetIdFromUrl || undefined}
      />

      {/* Top Metrics Row */}
        {loading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            <MetricCard
              label="Rev"
              value={metrics.total_revenue || 0}
            />
            <MetricCard
              label="Profit"
              value={metrics.total_profit || 0}
            />
            <MetricCard
              label="Paid"
              value={parseFloat(metrics.total_paid) || 0}
            />
            <MetricCard
              label="Req"
              value={parseFloat(metrics.total_requests) || 0}
            />
            <MetricCard
              label="Profit rate"
              value={data?.profitRate || 0}
              unit="%"
            />
          </div>
        ) : null}

        {/* Revenue & Profit Over Time */}
        {loading && !data ? (
          <ChartSkeleton />
        ) : timeSeries.length > 0 ? (
          <TimeSeriesChart
            title="Revenue & Profit Over Time"
            data={timeSeries}
            lines={[
              { dataKey: 'revenue', name: 'rev', color: colors.main },
              { dataKey: 'profit', name: 'profit', color: colors.accent },
            ]}
            height={300}
          />
        ) : null}

        {/* List of PID Tables - 2 columns layout */}
        {loading && !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            <TableSkeleton rows={10} />
            <TableSkeleton rows={10} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
            {/* List of PID Table with Lazy Loading */}
            <LazyDataTable
              title="List of PID"
              columns={[
                { key: 'pid', label: 'pid', width: '15%' },
                { key: 'pubname', label: 'pubname', width: '45%' },
                { key: 'rev', label: 'rev', width: '20%' },
                { key: 'profit', label: 'profit', width: '20%' },
              ]}
              data={listOfPidData}
              crossFilterColumns={['pid', 'pubname']}
              onLoadMore={loadMoreListOfPid}
              hasMore={listOfPidOffset < listOfPidTotal}
              isLoading={listOfPidLoading}
              totalCount={listOfPidTotal}
            />

            {/* List of PID by Date Table with Lazy Loading */}
            <LazyDataTable
              title="List of PID by date"
              columns={[
                { key: 'date', label: 'date', width: '18%', format: (v) => new Date(v.value || v).toLocaleDateString() },
                { key: 'pid', label: 'pid', width: '12%' },
                { key: 'pubname', label: 'pubname', width: '40%' },
                { key: 'rev', label: 'rev', width: '15%' },
                { key: 'profit', label: 'profit', width: '15%' },
              ]}
              data={listOfPidByDateData}
              crossFilterColumns={['date', 'pid', 'pubname']}
              onLoadMore={loadMoreListOfPidByDate}
              hasMore={listOfPidByDateOffset < listOfPidByDateTotal}
              isLoading={listOfPidByDateLoading}
              totalCount={listOfPidByDateTotal}
            />
          </div>
        )}

        {/* List of MID Tables - 2 columns layout */}
        {loading && !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            <TableSkeleton rows={10} />
            <TableSkeleton rows={10} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
            {/* List of MID Table with Lazy Loading */}
            <LazyDataTable
              title="List of MID"
              columns={[
                { key: 'mid', label: 'mid', width: '15%' },
                { key: 'medianame', label: 'medianame', width: '45%' },
                { key: 'rev', label: 'rev', width: '20%' },
                { key: 'profit', label: 'profit', width: '20%' },
              ]}
              data={listOfMidData}
              crossFilterColumns={['mid', 'medianame']}
              onLoadMore={loadMoreListOfMid}
              hasMore={listOfMidOffset < listOfMidTotal}
              isLoading={listOfMidLoading}
              totalCount={listOfMidTotal}
            />

            {/* List of MID by Date Table with Lazy Loading */}
            <LazyDataTable
              title="List of MID by date"
              columns={[
                { key: 'date', label: 'date', width: '18%', format: (v) => new Date(v.value || v).toLocaleDateString() },
                { key: 'mid', label: 'mid', width: '12%' },
                { key: 'medianame', label: 'medianame', width: '40%' },
                { key: 'rev', label: 'rev', width: '15%' },
                { key: 'profit', label: 'profit', width: '15%' },
              ]}
              data={listOfMidByDateData}
              crossFilterColumns={['date', 'mid', 'medianame']}
              onLoadMore={loadMoreListOfMidByDate}
              hasMore={listOfMidByDateOffset < listOfMidByDateTotal}
              isLoading={listOfMidByDateLoading}
              totalCount={listOfMidByDateTotal}
            />
          </div>
        )}

        {/* Top Rankings - 2x2 Grid */}
        {loading && !data ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
            {data?.topPublishers && data.topPublishers.length > 0 && (
              <BarChartComponent
                title="Top 10 publishers by Revenue"
                data={data.topPublishers}
                barDataKey="revenue"
                barName="rev"
                barColor={colors.main}
                xAxisDataKey="pubname"
                height={300}
              />
            )}

            {data?.topMedia && data.topMedia.length > 0 && (
              <BarChartComponent
                title="Top 10 media by Revenue"
                data={data.topMedia}
                barDataKey="revenue"
                barName="rev"
                barColor={colors.main}
                xAxisDataKey="medianame"
                height={300}
              />
            )}

            {data?.topZones && data.topZones.length > 0 && (
              <BarChartComponent
                title="Top 10 zones by Revenue"
                data={data.topZones}
                barDataKey="revenue"
                barName="rev"
                barColor={colors.main}
                xAxisDataKey="zonename"
                height={300}
              />
            )}

            {data?.topEcpm && data.topEcpm.length > 0 && (
              <BarChartComponent
                title="Top 10 zones by ecpm"
                data={data.topEcpm}
                barDataKey="ecpm"
                barName="request_CPM"
                barColor={colors.main}
                xAxisDataKey="zonename"
                height={300}
              />
            )}
          </div>
        ) : null}

        {/* Zone Monitoring Table */}
        {loading && !data ? (
          <TableSkeleton rows={10} />
        ) : data?.zoneMonitoring && data.zoneMonitoring.length > 0 ? (
          <DataTable
            title="Zone monitoring"
            columns={[
              { key: 'zid', label: 'zid' },
              { key: 'zonename', label: 'zonename' },
              { key: 'product', label: 'product' },
              { key: 'req', label: 'req', format: (v) => parseInt(v).toLocaleString() },
              { key: 'fill_rate', label: 'fill rate', format: (v) => `${Math.round(v * 100)}%` },
              { key: 'request_CPM', label: 'request_CPM' },
              { key: 'rev', label: 'rev' },
              { key: 'profit', label: 'profit' },
            ]}
            data={data.zoneMonitoring}
            crossFilterColumns={['zid', 'zonename', 'product']}
          />
        ) : null}

        {/* Zone Monitoring by Date Table with Lazy Loading */}
        {loading && !data ? (
          <TableSkeleton rows={10} />
        ) : (
          <LazyDataTable
            title="Zone monitoring by date"
            columns={[
              { key: 'date', label: 'date', width: '18%', format: (v) => new Date(v.value || v).toLocaleDateString() },
              { key: 'zid', label: 'zid', width: '7%' },
              { key: 'zonename', label: 'zonename', width: '16%' },
              { key: 'product', label: 'product', width: '11%' },
              { key: 'req', label: 'req', width: '10%', format: (v) => parseInt(v).toLocaleString() },
              { key: 'fill_rate', label: 'fill rate', width: '9%', format: (v) => `${Math.round(v * 100)}%` },
              { key: 'request_CPM', label: 'request_CPM', width: '11%' },
              { key: 'rev', label: 'rev', width: '9%' },
              { key: 'profit', label: 'profit', width: '9%' },
            ]}
            data={zoneMonitoringTimeSeries}
            crossFilterColumns={['date', 'zid', 'zonename', 'product']}
            onLoadMore={loadMoreZoneMonitoring}
            hasMore={zoneMonitoringOffset < zoneMonitoringTotal}
            isLoading={zoneMonitoringLoading}
            totalCount={zoneMonitoringTotal}
          />
        )}

        {/* Product-Level Trend */}
        {loading && !data ? (
          <ChartSkeleton />
        ) : productTrendData.length > 0 ? (
          <div className="space-y-4">
            {/* Metric Selector */}
            <div className="flex items-center gap-4 px-4">
              <span className="text-sm font-medium text-gray-700">Select Metric:</span>
              <ToggleGroup
                type="single"
                value={selectedMetric}
                onValueChange={(value) => {
                  if (value) setSelectedMetric(value as 'revenue' | 'profit' | 'requests' | 'paid' | 'ecpm' | 'fill_rate')
                }}
              >
                <ToggleGroupItem value="revenue">Revenue</ToggleGroupItem>
                <ToggleGroupItem value="profit">Profit</ToggleGroupItem>
                <ToggleGroupItem value="requests">Requests</ToggleGroupItem>
                <ToggleGroupItem value="paid">Paid</ToggleGroupItem>
                <ToggleGroupItem value="ecpm">eCPM</ToggleGroupItem>
                <ToggleGroupItem value="fill_rate">Fill Rate</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Chart Rendering */}
            {selectedMetric === 'fill_rate' ? (
              <TimeSeriesChart
                title="Product-Level Trend: Fill Rate Over Time"
                data={productTrendDataWithFillRate}
                lines={Array.from(new Set(productTrendRaw.map((d: any) => d.product))).map((product: any, idx: number) => ({
                  dataKey: `${product}_fill_rate`,
                  name: product,
                  color: ['#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'][idx % 5],
                }))}
                height={300}
                customYAxisFormatter={(value) => `${Math.round(value)}%`}
                customTooltipFormatter={(value, name) => [`${safeToFixed(value, 2)}%`, name]}
              />
            ) : (
              <TimeSeriesChart
                title={`Product-Level Trend Over Time (${selectedMetric})`}
                data={productTrendData}
                lines={Array.from(new Set(productTrendRaw.map((d: any) => d.product))).map((product: any, idx: number) => ({
                  dataKey: `${product}_${selectedMetric}`,
                  name: product,
                  color: ['#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'][idx % 5],
                }))}
                height={300}
              />
            )}
          </div>
        ) : null}
    </AnalyticsPageLayout>
  )
}

export default function BusinessHealthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BusinessHealthPageContent />
    </Suspense>
  )
}
