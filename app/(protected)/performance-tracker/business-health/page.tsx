'use client'

import { useState, useRef, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MetricCard } from '../../../components/performance-tracker/MetricCard'
import { TimeSeriesChart } from '../../../components/performance-tracker/TimeSeriesChart'
import { DrillableTimeSeriesChart } from '../../../components/performance-tracker/DrillableTimeSeriesChart'
import { BarChartComponent } from '../../../components/performance-tracker/BarChart'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { LazyDataTable } from '../../../components/performance-tracker/LazyDataTable'
import MetricCardSkeleton from '../../../components/performance-tracker/skeletons/MetricCardSkeleton'
import ChartSkeleton from '../../../components/performance-tracker/skeletons/ChartSkeleton'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { LazyDataTableSkeleton } from '../../../components/performance-tracker/skeletons/LazyDataTableSkeleton'
import { colors } from '../../../../lib/colors'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { useBusinessHealth } from '../../../../lib/hooks/queries/useBusinessHealth'
import { useTeamConfigurations } from '../../../../lib/hooks/queries/useTeamConfigurations'
import { useTeamBreakdown } from '../../../../lib/hooks/queries/useTeamBreakdown'
import { usePICBreakdown } from '../../../../lib/hooks/queries/usePICBreakdown'
import { ToggleGroup, ToggleGroupItem } from '../../../../src/components/ui/toggle-group'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { MetricFilterPanel } from '../../../components/performance-tracker/MetricFilterPanel'
import { useDefaultDateRange } from '../../../../lib/hooks/useDefaultDateRange'
import { safeToFixed, safeNumber, formatDate } from '../../../../lib/utils/formatters'
import { filterDataMulti } from '../../../../lib/hooks/useClientSideFilter'
import type { MetricFilters } from '../../../../lib/types/performanceTracker'

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
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>(defaultDateRange)

  // ✨ NEW: Metric filters state (for filtering by aggregated metrics)
  const [metricFilters, setMetricFilters] = useState<MetricFilters>({
    clauses: [],
    logic: 'AND'
  })

  const { crossFilters } = useCrossFilter()
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'profit' | 'requests' | 'paid' | 'ecpm' | 'fill_rate'>('revenue')

  // ✨ NEW: Combined filters including metric filters
  const combinedFilters = useMemo(() => ({
    ...currentFilters,
    metricFilters,
  }), [currentFilters, metricFilters])

  // Stabilize setCurrentFilters to prevent infinite re-render loops in child components
  const stableSetCurrentFilters = useCallback((filters: Record<string, any>) => {
    setCurrentFilters(filters)
  }, [])

  // ✨ Use React Query hook for data fetching with automatic caching
  const { data: rawData, isLoading: loading, error } = useBusinessHealth(combinedFilters)

  // ✨ Fetch team configurations for drill-down chart
  const { data: teamData, isLoading: teamLoading } = useTeamConfigurations()
  const teamConfigs = teamData?.teams || []
  const picMappings = teamData?.picMappings || []

  // ✨ NEW: State for on-demand PIC breakdown loading
  const [selectedTeamForDrill, setSelectedTeamForDrill] = useState<string | null>(null)

  // ✨ NEW: Fetch team breakdown (always loaded, small payload ~120 rows)
  const { data: teamBreakdownResponse, isLoading: isTeamBreakdownLoading } = useTeamBreakdown(combinedFilters)
  const teamBreakdownData = teamBreakdownResponse?.teamBreakdown || []

  // ✨ NEW: Fetch PIC breakdown on-demand (only when user clicks a team)
  const { data: picBreakdownResponse, isLoading: isPICBreakdownLoading } = usePICBreakdown(
    selectedTeamForDrill,
    combinedFilters,
    !!selectedTeamForDrill  // Only enabled when team selected
  )
  const picBreakdownData = picBreakdownResponse?.picBreakdown || []

  // ✨ NEW: Callback to handle drilling from Team to PIC level
  const handleDrillToPIC = useCallback((teamId: string | string[]) => {
    // Normalize: Convert array to string (take first element)
    const normalizedTeamId = Array.isArray(teamId) ? teamId[0] : teamId

    console.log('[BusinessHealth] Drilling to PIC level for team:', normalizedTeamId)
    setSelectedTeamForDrill(normalizedTeamId)
    // This triggers usePICBreakdown to fetch data for this team
  }, [])

  // 🟢 PERFORMANCE OPTIMIZATION: Split memoization to reduce re-render scope
  // baseData: Only re-memoizes when rawData changes (server-side filters)
  const baseData = useMemo(() => {
    if (!rawData) return undefined
    return {
      metrics: rawData.metrics,
      timeSeries: rawData.timeSeries,
      productTrend: rawData.productTrend,
      topPublishers: rawData.topPublishers,
      topMedia: rawData.topMedia,
      topZones: rawData.topZones,
      topEcpm: rawData.topEcpm,
      profitRate: rawData.profitRate, // 🔧 FIX: Include profitRate from API
    }
  }, [rawData])

  // 🟢 filteredData: Only re-memoizes when rawData OR crossFilters change
  // Smaller scope = faster re-renders when crossFilters change
  const filteredData = useMemo(() => {
    if (!rawData) return undefined
    return {
      zoneMonitoring: filterDataMulti(rawData.zoneMonitoring, crossFilters),
      zoneMonitoringTimeSeries: filterDataMulti(rawData.zoneMonitoringTimeSeries, crossFilters),
      listOfPid: filterDataMulti(rawData.listOfPid, crossFilters),
      listOfPidByDate: filterDataMulti(rawData.listOfPidByDate, crossFilters),
      listOfMid: filterDataMulti(rawData.listOfMid, crossFilters),
      listOfMidByDate: filterDataMulti(rawData.listOfMidByDate, crossFilters),
    }
  }, [rawData, crossFilters])

  // 🟢 Combine baseData and filteredData (cheap object spread)
  const data = useMemo(() => {
    if (!baseData || !filteredData) return undefined
    return { ...baseData, ...filteredData }
  }, [baseData, filteredData])

  // Column configurations for skeletons
  const listOfPidColumns = [
    { key: 'pid', label: 'pid', width: '13%' },
    { key: 'pubname', label: 'pubname', width: '30%' },
    { key: 'rev', label: 'rev', width: '14.25%' },
    { key: 'profit', label: 'profit', width: '14.25%' },
    { key: 'rev_to_pub', label: 'rev to pub', width: '14.25%' },
    { key: 'ecpm', label: 'avg eCPM', width: '14.25%' },
    { key: 'fill_rate', label: 'fill rate %', width: '12%' },
  ]

  const listOfPidByDateColumns = [
    { key: 'date', label: 'date', width: '15%', format: (v: any) => formatDate(v.value || v) },
    { key: 'pid', label: 'pid', width: '10%' },
    { key: 'pubname', label: 'pubname', width: '25%' },
    { key: 'rev', label: 'rev', width: '12.5%' },
    { key: 'profit', label: 'profit', width: '12.5%' },
    { key: 'rev_to_pub', label: 'rev to pub', width: '12.5%' },
    { key: 'ecpm', label: 'avg eCPM', width: '12.5%' },
    { key: 'fill_rate', label: 'fill rate %', width: '12%' },
  ]

  const listOfMidColumns = [
    { key: 'mid', label: 'mid', width: '13%' },
    { key: 'medianame', label: 'medianame', width: '30%' },
    { key: 'rev', label: 'rev', width: '14.25%' },
    { key: 'profit', label: 'profit', width: '14.25%' },
    { key: 'rev_to_pub', label: 'rev to pub', width: '14.25%' },
    { key: 'ecpm', label: 'avg eCPM', width: '14.25%' },
    { key: 'fill_rate', label: 'fill rate %', width: '12%' },
  ]

  const listOfMidByDateColumns = [
    { key: 'date', label: 'date', width: '15%', format: (v: any) => formatDate(v.value || v) },
    { key: 'mid', label: 'mid', width: '10%' },
    { key: 'medianame', label: 'medianame', width: '25%' },
    { key: 'rev', label: 'rev', width: '12.5%' },
    { key: 'profit', label: 'profit', width: '12.5%' },
    { key: 'rev_to_pub', label: 'rev to pub', width: '12.5%' },
    { key: 'ecpm', label: 'avg eCPM', width: '12.5%' },
    { key: 'fill_rate', label: 'fill rate %', width: '12%' },
  ]

  const zoneMonitoringColumns = [
    { key: 'zid', label: 'zid' },
    { key: 'zonename', label: 'zonename' },
    { key: 'product', label: 'product' },
    { key: 'req', label: 'req', format: (v: any) => parseInt(v).toLocaleString() },
    { key: 'fill_rate', label: 'fill rate', format: (v: any) => `${Math.round(v * 100)}%` },
    { key: 'request_CPM', label: 'request_CPM' },
    { key: 'rev', label: 'rev' },
    { key: 'profit', label: 'profit' },
    { key: 'rev_to_pub', label: 'rev to pub' },
  ]

  const zoneMonitoringByDateColumns = [
    { key: 'date', label: 'date', width: '16%', format: (v: any) => formatDate(v.value || v) },
    { key: 'zid', label: 'zid', width: '6%' },
    { key: 'zonename', label: 'zonename', width: '14%' },
    { key: 'product', label: 'product', width: '10%' },
    { key: 'req', label: 'req', width: '9%', format: (v: any) => parseInt(v).toLocaleString() },
    { key: 'fill_rate', label: 'fill rate', width: '8%', format: (v: any) => `${Math.round(v * 100)}%` },
    { key: 'request_CPM', label: 'request_CPM', width: '10%' },
    { key: 'rev', label: 'rev', width: '9%' },
    { key: 'profit', label: 'profit', width: '9%' },
    { key: 'rev_to_pub', label: 'rev to pub', width: '9%' },
  ]

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
    if (!data?.zoneMonitoringTimeSeries) return []
    return data.zoneMonitoringTimeSeries.map((d: any) => {
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
  }, [data?.zoneMonitoringTimeSeries])

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

      {/* ✨ NEW: Metric Filter Panel - Filter by aggregated metrics */}
      <MetricFilterPanel
        metricFilters={metricFilters}
        onMetricFiltersChange={setMetricFilters}
        disabled={loading}
      />

      {/* Top Metrics Row - Max 2 rows on mobile */}
        {loading && !data ? (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2.5 md:gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2.5 md:gap-4">
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
            <MetricCard
              label="Avg eCPM"
              value={metrics.avg_ecpm || 0}
            />
            <MetricCard
              label="Avg Fill Rate"
              value={metrics.avg_fill_rate || 0}
              unit="%"
            />
          </div>
        ) : null}

        {/* Revenue & Profit Over Time - with Drill-Down */}
        {(loading || teamLoading) && !data ? (
          <ChartSkeleton />
        ) : timeSeries.length > 0 ? (
          <DrillableTimeSeriesChart
            totalTimeSeries={timeSeries}
            pidByDateData={data?.listOfPidByDate || []}
            midByDateData={data?.listOfMidByDate || []}
            zoneTimeSeriesData={data?.zoneMonitoringTimeSeries || []}
            teamConfigs={teamConfigs}
            picMappings={picMappings}
            currentFilters={currentFilters}
            teamBreakdownData={teamBreakdownData}
            picBreakdownData={picBreakdownData}
            onDrillToPIC={handleDrillToPIC}
            isLoading={loading || teamLoading || isTeamBreakdownLoading || isPICBreakdownLoading}
            title="Revenue & Profit Over Time"
            height={300}
            topN={15}
          />
        ) : null}

        {/* List of PID Tables - 2 columns layout */}
        {loading && !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            <LazyDataTableSkeleton columns={listOfPidColumns} rows={10} />
            <LazyDataTableSkeleton columns={listOfPidByDateColumns} rows={10} />
          </div>
        ) : data?.listOfPid || data?.listOfPidByDate ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
            {/* List of PID Table - Client-side filtered */}
            {data.listOfPid && (
              <LazyDataTable
                title="List of PID"
                columns={listOfPidColumns}
                data={data.listOfPid}
                crossFilterColumns={['pid', 'pubname']}
              />
            )}

            {/* List of PID by Date Table - Client-side filtered */}
            {data.listOfPidByDate && (
              <LazyDataTable
                title="List of PID by date"
                columns={listOfPidByDateColumns}
                data={data.listOfPidByDate}
                crossFilterColumns={['date', 'pid', 'pubname']}
              />
            )}
          </div>
        ) : null}

        {/* List of MID Tables - 2 columns layout */}
        {loading && !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            <LazyDataTableSkeleton columns={listOfMidColumns} rows={10} />
            <LazyDataTableSkeleton columns={listOfMidByDateColumns} rows={10} />
          </div>
        ) : data?.listOfMid || data?.listOfMidByDate ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
            {/* List of MID Table - Client-side filtered */}
            {data.listOfMid && (
              <LazyDataTable
                title="List of MID"
                columns={listOfMidColumns}
                data={data.listOfMid}
                crossFilterColumns={['mid', 'medianame']}
              />
            )}

            {/* List of MID by Date Table - Client-side filtered */}
            {data.listOfMidByDate && (
              <LazyDataTable
                title="List of MID by date"
                columns={listOfMidByDateColumns}
                data={data.listOfMidByDate}
                crossFilterColumns={['date', 'mid', 'medianame']}
              />
            )}
          </div>
        ) : null}

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
          <DataTableSkeleton columns={zoneMonitoringColumns} rows={10} />
        ) : data?.zoneMonitoring && data.zoneMonitoring.length > 0 ? (
          <DataTable
            title="Zone monitoring"
            columns={zoneMonitoringColumns}
            data={data.zoneMonitoring}
            crossFilterColumns={['zid', 'zonename', 'product']}
          />
        ) : null}

        {/* Zone Monitoring by Date Table - Client-side filtered */}
        {loading && !data ? (
          <LazyDataTableSkeleton columns={zoneMonitoringByDateColumns} rows={10} />
        ) : data?.zoneMonitoringTimeSeries ? (
          <LazyDataTable
            title="Zone monitoring by date"
            columns={zoneMonitoringByDateColumns}
            data={data.zoneMonitoringTimeSeries}
            crossFilterColumns={['date', 'zid', 'zonename', 'product']}
          />
        ) : null}

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
