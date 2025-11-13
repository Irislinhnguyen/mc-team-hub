'use client'

import { useState, useRef, Suspense, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { TimeSeriesChart } from '../../../components/performance-tracker/TimeSeriesChart'
import { StackedBarChart } from '../../../components/performance-tracker/StackedBarChart'
import { PieChart } from '../../../components/performance-tracker/PieChart'
import { colors } from '../../../../lib/colors'
import { formatChartTooltip } from '../../../../lib/utils/formatters'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
import { DateSelector } from '../../../components/gcpp-check/DateSelector'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useGCPPFilters } from '../../../../lib/hooks'
import { getPartnerColorMap, partnerColors } from '../../../../lib/config/partnerColors'
import { useGCPPMarketOverview } from '../../../../lib/hooks/queries/useGCPPMarketOverview'
import { useQueryClient } from '@tanstack/react-query'
import ChartSkeleton from '../../../components/performance-tracker/skeletons/ChartSkeleton'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { formatPartnerName, formatStringValue } from '../../../../lib/utils/formatters'
import { normalizeFilterValue } from '../../../../lib/utils/filterHelpers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { composedStyles, typography } from '../../../../lib/design-tokens'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'

function MarketOverviewPageContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const presetIdFromUrl = searchParams.get('preset')
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [latestDateLoaded, setLatestDateLoaded] = useState(false)
  const [fetchingInitialDate, setFetchingInitialDate] = useState(true)
  const [selectedPartnerForPie, setSelectedPartnerForPie] = useState<string>('GENIEE')

  // Get query client for cache management
  const queryClient = useQueryClient()

  // ⚠️ TEMPORARY: Clear React Query cache on mount to fix stale data issue
  useEffect(() => {
    console.log('[Market Overview] 🗑️ Clearing React Query cache')
    queryClient.clear()
  }, [queryClient])

  // Shared hook for filter + cross-filter management
  const { filters, setMetadataFilters, setDateFilters } = useGCPPFilters({})
  const { crossFilters } = useCrossFilter()

  // Column configurations
  const marketShareDetailColumns = [
    { key: 'partner', label: 'Partner', format: formatPartnerName },
    { key: 'market', label: 'Market', format: formatStringValue },
    { key: 'market_share_percent', label: 'Market Share %' },
    { key: 'total_impressions', label: 'Total Impressions' }
  ]

  // Use React Query hook for data fetching and caching
  const queryResult = useGCPPMarketOverview(filters)
  const { data: rawData, isLoading: loading, error, isFetching, status, fetchStatus } = queryResult

  // Apply client-side filtering for cross-filters (instant, no API call)
  const { filteredData: filteredMarketShareDetail } = useClientSideFilterMulti(
    rawData?.marketShareDetail,
    crossFilters
  )
  const { filteredData: filteredMarketShareByMarketPartner } = useClientSideFilterMulti(
    rawData?.marketShareByMarketPartner,
    crossFilters
  )
  const { filteredData: filteredImpressionsTimeSeries } = useClientSideFilterMulti(
    rawData?.impressionsTimeSeries,
    crossFilters
  )
  const { filteredData: filteredMarketDistribution } = useClientSideFilterMulti(
    rawData?.marketDistribution,
    crossFilters
  )

  // Combine filtered data into single object for backward compatibility
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      marketShareDetail: filteredMarketShareDetail,
      marketShareByMarketPartner: filteredMarketShareByMarketPartner,
      impressionsTimeSeries: filteredImpressionsTimeSeries,
      marketDistribution: filteredMarketDistribution,
    }
  }, [filteredMarketShareDetail, filteredMarketShareByMarketPartner, filteredImpressionsTimeSeries, filteredMarketDistribution, rawData])

  const chartsLoading = loading
  const tablesLoading = loading

  // Debug: Log filters and query state
  useEffect(() => {
    console.log('[Market Overview] Filters:', filters)
    console.log('[Market Overview] Filters count:', Object.keys(filters).length)
    console.log('[Market Overview] 🔍 Partner filter value:', filters.partner)
    console.log('[Market Overview] 🔍 Market filter value:', filters.market)
    console.log('[Market Overview] 🔍 Team filter value:', filters.team)
    console.log('[Market Overview] Query Status:', status)
    console.log('[Market Overview] Fetch Status:', fetchStatus)
    console.log('[Market Overview] Is Fetching:', isFetching)
    console.log('[Market Overview] Is Loading:', loading)
    console.log('[Market Overview] Data:', data)
    console.log('[Market Overview] Error:', error)
  }, [filters, data, loading, error, isFetching, status, fetchStatus])

  // Auto-load latest date on mount (single date mode only)
  useEffect(() => {
    if (latestDateLoaded || dateMode !== 'single' || selectedDate) {
      setFetchingInitialDate(false)
      return
    }

    const fetchLatestDate = async () => {
      setFetchingInitialDate(true)
      try {
        const response = await fetch('/api/gcpp-check/available-dates')
        const result = await response.json()
        if (result.status === 'ok' && result.data.latestDate) {
          setSelectedDate(result.data.latestDate)
          setDateFilters({ date: result.data.latestDate })
          setLatestDateLoaded(true)
        }
      } catch (error) {
        console.error('Error fetching latest date:', error)
      } finally {
        setFetchingInitialDate(false)
      }
    }

    fetchLatestDate()
  }, [latestDateLoaded, dateMode, selectedDate])

  const handleDateModeChange = (mode: 'single' | 'range') => {
    setDateMode(mode)
    // Clear date-related filters when switching modes
    setDateFilters({})

    // Reset date states
    if (mode === 'single') {
      setStartDate(null)
      setEndDate(null)
    } else {
      setSelectedDate('')
    }
  }

  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date)
    setDateFilters({ date })
  }

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setStartDate(start)
    setEndDate(end)

    if (start && end) {
      setDateFilters({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      })
    }
  }


  // Prepare data for stacked bar chart
  const prepareStackedBarData = () => {
    if (!data?.marketShareByMarketPartner) return { data: [], categories: [] }

    const groupedByMarket: Record<string, any> = {}
    const partners = new Set<string>()

    // First pass: collect all data
    data.marketShareByMarketPartner.forEach((row: any) => {
      const formattedPartner = formatPartnerName(normalizeFilterValue(row.partner))
      const market = normalizeFilterValue(row.market)
      if (!groupedByMarket[market]) {
        groupedByMarket[market] = { market }
      }
      // Use percentage value as-is (already in percentage format)
      groupedByMarket[market][formattedPartner] = parseFloat(normalizeFilterValue(row.market_share_percent)) || 0
      partners.add(formattedPartner)
    })

    // Second pass: fill missing values with 0 for stacked bars to work
    const partnersList = Array.from(partners).filter(p => p && p.trim() !== '')
    Object.values(groupedByMarket).forEach((marketData: any) => {
      partnersList.forEach(partner => {
        if (marketData[partner] === undefined) {
          marketData[partner] = 0
        }
      })
    })

    const chartData = Object.values(groupedByMarket)
    const categories = partnersList.map(partner => ({
      dataKey: partner,
      name: partner,
    }))

    return { data: chartData, categories }
  }

  // Prepare time series data
  const prepareTimeSeriesData = () => {
    if (!data?.impressionsTimeSeries) return { data: [], lines: [] }

    const groupedByDate: Record<string, any> = {}
    const partners = new Set<string>()

    data.impressionsTimeSeries.forEach((row: any) => {
      const formattedPartner = formatPartnerName(normalizeFilterValue(row.partner))
      // Normalize date - could be string or {value: "2025-11-10"}
      const dateKey = normalizeFilterValue(row.date)
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { date: dateKey, rawDate: dateKey }
      }
      groupedByDate[dateKey][formattedPartner] = parseFloat(normalizeFilterValue(row.impressions)) || 0
      partners.add(formattedPartner)
    })

    const chartData = Object.values(groupedByDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const filteredPartners = Array.from(partners).filter(p => p && p.trim() !== '')
    const colorMap = getPartnerColorMap(filteredPartners)
    const lines = filteredPartners.map(partner => ({
      dataKey: partner,
      name: partner,
      color: colorMap[partner]
    }))

    return { data: chartData, lines }
  }

  // Prepare pie chart data - show all markets for selected partner, with highlighting for filtered markets
  const preparePieChartData = () => {
    if (!data?.marketDistribution) return { data: [], highlightMarkets: [] }

    // Filter data for selected partner only
    const partnerData = data.marketDistribution.filter(
      (row: any) => normalizeFilterValue(row.partner)?.toUpperCase() === selectedPartnerForPie
    )

    const chartData = partnerData
      .filter((row: any) => {
        const market = normalizeFilterValue(row.market)
        return market && market.trim() !== ''
      })
      .map((row: any) => ({
        market: normalizeFilterValue(row.market),
        value: parseFloat(normalizeFilterValue(row.percent_of_total)) || 0, // Use percent as the value for pie chart
        impressions: parseFloat(normalizeFilterValue(row.impressions)) || 0, // Keep for tooltip
        percent: parseFloat(normalizeFilterValue(row.percent_of_total)) || 0
      }))

    // Detect market filters (includes both metadata filters and cross-filters)
    const highlightMarkets: string[] = []

    if (filters.market) {
      const markets = Array.isArray(filters.market) ? filters.market : [filters.market]
      highlightMarkets.push(...markets)
    }

    return { data: chartData, highlightMarkets }
  }

  const stackedBarData = prepareStackedBarData()
  const timeSeriesData = prepareTimeSeriesData()
  const pieChartResult = preparePieChartData()
  const pieChartData = pieChartResult.data
  const highlightMarkets = pieChartResult.highlightMarkets
  const partnerColorMap = getPartnerColorMap(
    stackedBarData.categories
      .filter(c => c && c.name && c.name.trim() !== '')
      .map(c => c.name)
  )

  return (
    <AnalyticsPageLayout
      title="Market Overview"
      showExport={true}
      contentRef={contentRef}
    >
      {/* Filter Controls Row */}
      <div className="flex items-center gap-4 mb-6">
        <DateModeToggle mode={dateMode} onModeChange={handleDateModeChange} />
        <DateSelector
          mode={dateMode}
          onDateChange={handleSingleDateChange}
          onDateRangeChange={handleDateRangeChange}
          initialDate={selectedDate}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      </div>

      {/* Filter Panel with Preset System */}
      <MetadataFilterPanel
        page="gcpp-market-overview"
        filterFields={['team', 'partner', 'market']}
        onFilterChange={setMetadataFilters}
        isLoading={loading}
        metadataEndpoint="/api/gcpp-check/metadata"
        presetIdFromUrl={presetIdFromUrl || undefined}
      />

      {/* Row 1: Stacked Bar Chart + Market Share Detail Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
        {/* Chart 1: Market share by market and partner */}
        {chartsLoading && !data ? (
          <ChartSkeleton />
        ) : stackedBarData.data.length > 0 ? (
          <StackedBarChart
            title="Market share by market and partner"
            data={stackedBarData.data}
            categories={stackedBarData.categories}
            xAxisDataKey="market"
            layout="vertical"
            colorMap={partnerColorMap}
            height={400}
            enableCrossFilter={true}
            crossFilterField="market"
          />
        ) : null}

        {/* Table 1: Market share in detail */}
        {tablesLoading ? (
          <DataTableSkeleton columns={marketShareDetailColumns} rows={10} />
        ) : data?.marketShareDetail ? (
          <DataTable
            title="Market share in detail"
            columns={marketShareDetailColumns}
            data={data.marketShareDetail}
            crossFilterColumns={['partner', 'market']}
          />
        ) : null}
      </div>

      {/* Row 2: Time Series Chart + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
        {/* Chart 2: Impressions by market and partner */}
        {chartsLoading && !data ? (
          <ChartSkeleton />
        ) : timeSeriesData.data.length > 0 ? (
          <TimeSeriesChart
            title="Impressions by market and partner"
            data={timeSeriesData.data}
            lines={timeSeriesData.lines}
            height={400}
            enableCrossFilter={true}
            dateKey="date"
          />
        ) : null}

        {/* Chart 3: Market distribution by partner */}
        {chartsLoading && !data ? (
          <ChartSkeleton />
        ) : pieChartData && pieChartData.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded shadow-sm" style={{ height: '480px', borderColor: colors.neutralLight }}>
            {/* Card Header with Title and Partner Selector */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: colors.neutralLight }}>
              <h3
                className={composedStyles.sectionTitle}
                style={{
                  fontSize: typography.sizes.sectionTitle,
                  color: colors.main
                }}
              >
                Market distribution - {formatPartnerName(selectedPartnerForPie)}
              </h3>
              <Select
                value={selectedPartnerForPie}
                onValueChange={setSelectedPartnerForPie}
              >
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue placeholder="Partner" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(partnerColors).map((partner) => (
                    <SelectItem key={partner} value={partner.toUpperCase()}>
                      {partner}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart Content */}
            <div className="p-6" style={{ height: 'calc(100% - 68px)' }}>
              <PieChart
                title=""
                data={pieChartData}
                dataKey="value"
                nameKey="market"
                height={380}
                showLegend={true}
                showLabels={true}
                highlightValues={highlightMarkets}
              />
            </div>
          </div>
        ) : null}
      </div>

      {fetchingInitialDate && (
        <>
          <ChartSkeleton />
          <DataTableSkeleton columns={marketShareDetailColumns} rows={5} />
          <ChartSkeleton />
        </>
      )}

      {!loading && !data && !fetchingInitialDate && (
        <div className="p-8 text-center text-gray-500">
          <p>No data available. Please select filters.</p>
        </div>
      )}
    </AnalyticsPageLayout>
  )
}

export default function MarketOverviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MarketOverviewPageContent />
    </Suspense>
  )
}
