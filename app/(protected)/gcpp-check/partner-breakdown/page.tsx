'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { TimeSeriesChart } from '../../../components/performance-tracker/TimeSeriesChart'
import { PieChart } from '../../../components/performance-tracker/PieChart'
import { PublisherCategoryBadge } from '../../../components/gcpp-check/PublisherCategoryBadge'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
import { DateSelector } from '../../../components/gcpp-check/DateSelector'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useGCPPFilters } from '../../../../lib/hooks'
import { getPartnerColorMap, getCategoryColor } from '../../../../lib/config/partnerColors'
import ChartSkeleton from '../../../components/performance-tracker/skeletons/ChartSkeleton'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { useGCPPPartnerBreakdown } from '../../../../lib/hooks/queries/useGCPPPartnerBreakdown'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'
import { formatStringValue, formatDateValue } from '../../../../lib/utils/formatters'

function PartnerBreakdownPageContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const presetIdFromUrl = searchParams.get('preset')
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [isDateSelectorLoading, setIsDateSelectorLoading] = useState(true)

  // Shared hook for filter + cross-filter management
  const { filters, setMetadataFilters, setDateFilters } = useGCPPFilters({})
  const { crossFilters } = useCrossFilter()

  // React Query hook for data fetching
  const { data: rawData, isLoading: loading } = useGCPPPartnerBreakdown(filters)

  // Apply client-side filtering for cross-filters
  const { filteredData: filteredPubCountOver } = useClientSideFilterMulti(
    rawData?.pubCountOver200K,
    crossFilters
  )
  const { filteredData: filteredPubCountDetail } = useClientSideFilterMulti(
    rawData?.pubCountDetail,
    crossFilters
  )
  const { filteredData: filteredPubCountTimeSeries } = useClientSideFilterMulti(
    rawData?.pubCountTimeSeries,
    crossFilters
  )
  const { filteredData: filteredCategoryDistribution } = useClientSideFilterMulti(
    rawData?.categoryDistribution,
    crossFilters
  )

  // Combine filtered data
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      pubCountOver200K: filteredPubCountOver,
      pubCountDetail: filteredPubCountDetail,
      pubCountTimeSeries: filteredPubCountTimeSeries,
      categoryDistribution: filteredCategoryDistribution,
    }
  }, [filteredPubCountOver, filteredPubCountDetail, filteredPubCountTimeSeries, filteredCategoryDistribution, rawData])

  // Show loading state when query is running OR when we have filters but no data yet
  const hasFilters = Object.keys(filters).length > 0
  const shouldShowLoading = loading || isDateSelectorLoading || (hasFilters && !data)

  // Column configurations
  const pubCountOver200KColumns = [
    { key: 'date', label: 'Date', format: formatDateValue },
    { key: 'partner', label: 'Partner', format: formatStringValue },
    { key: 'team', label: 'Team', format: formatStringValue },
    { key: 'category', label: 'Category', format: formatStringValue },
    { key: 'pub_count', label: 'Pub Count' }
  ]

  const pubCountDetailColumns = [
    { key: 'date', label: 'Date', format: formatDateValue },
    { key: 'partner', label: 'Partner', format: formatStringValue },
    { key: 'domain_app_id', label: 'Domain/App ID', format: formatStringValue },
    { key: 'app_name', label: 'App Name', format: formatStringValue },
    { key: 'category', label: 'Category', format: formatStringValue },
    { key: 'total_impressions', label: 'Total Impressions' }
  ]

  // Date mode change handler
  const handleDateModeChange = (mode: 'single' | 'range') => {
    setDateMode(mode)
    setDateFilters({})
    if (mode === 'single') {
      setStartDate(null)
      setEndDate(null)
    } else {
      setSelectedDate('')
    }
  }

  // Single date change handler
  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date)
    setDateFilters({ date })
  }

  // Date range change handler
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


  // Prepare time series data
  const timeSeriesData = useMemo(() => {
    if (!data?.pubCountTimeSeries) return { data: [], lines: [] }

    const groupedByDate: Record<string, any> = {}
    const partners = new Set<string>()

    data.pubCountTimeSeries.forEach((row: any) => {
      if (!groupedByDate[row.date]) {
        groupedByDate[row.date] = { date: row.date, rawDate: row.date }
      }
      // Aggregate by summing (multiple categories per date-partner)
      const currentCount = groupedByDate[row.date][row.partner] || 0
      groupedByDate[row.date][row.partner] = currentCount + row.pub_count
      partners.add(row.partner)
    })

    const chartData = Object.values(groupedByDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const colorMap = getPartnerColorMap(Array.from(partners))
    const lines = Array.from(partners).map(partner => ({
      dataKey: partner,
      name: partner,
      color: colorMap[partner]
    }))

    return { data: chartData, lines }
  }, [data?.pubCountTimeSeries])

  // Prepare pie chart data (category distribution)
  const categoryPieData = useMemo(() => {
    if (!data?.categoryDistribution) return []

    // Aggregate by category (sum across partners after filtering)
    const grouped = data.categoryDistribution.reduce((acc: Record<string, any>, row: any) => {
      const cat = row.category
      if (!acc[cat]) {
        acc[cat] = { category: cat, pub_count: 0 }
      }
      acc[cat].pub_count += row.pub_count
      return acc
    }, {})

    return Object.values(grouped)
  }, [data?.categoryDistribution])
  const categoryColorMap: Record<string, string> = {
    '>10M': getCategoryColor('>10M'),
    '>5M': getCategoryColor('>5M'),
    '>200K': getCategoryColor('>200K'),
    '<=200K': getCategoryColor('<=200K')
  }

  return (
    <AnalyticsPageLayout
      title="Partner Breakdown"
      showExport={true}
      contentRef={contentRef}
    >
      {/* Date Mode Toggle and Date Selector */}
      <div className="flex items-center gap-4 mb-6">
        <DateModeToggle mode={dateMode} onModeChange={handleDateModeChange} />
        <DateSelector
          mode={dateMode}
          onDateChange={handleSingleDateChange}
          onDateRangeChange={handleDateRangeChange}
          onLoadingChange={setIsDateSelectorLoading}
          initialDate={selectedDate}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      </div>

      {/* Filter Panel with integrated Preset System */}
      <MetadataFilterPanel
        page="gcpp-partner-breakdown"
        filterFields={['team', 'partner', 'category']}
        onFilterChange={setMetadataFilters}
        isLoading={loading}
        metadataEndpoint="/api/gcpp-check/metadata"
        presetIdFromUrl={presetIdFromUrl || undefined}
      />

      {/* Charts Grid: 2 columns on desktop, 1 column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart 1: Total pub count by partner (Time Series) */}
        {shouldShowLoading ? (
          <ChartSkeleton />
        ) : timeSeriesData.data.length > 0 ? (
          <div>
            <TimeSeriesChart
              title="Total pub count by partner"
              data={timeSeriesData.data}
              lines={timeSeriesData.lines}
              height={400}
              enableCrossFilter={true}
              crossFilterField="partner"
            />
          </div>
        ) : null}

        {/* Chart 2: Publisher Category by partner (Pie Chart) */}
        {shouldShowLoading ? (
          <ChartSkeleton />
        ) : categoryPieData.length > 0 ? (
          <div>
            <PieChart
              title="Publisher Category by partner"
              data={categoryPieData}
              dataKey="pub_count"
              nameKey="category"
              colorMap={categoryColorMap}
              height={400}
              showLegend={true}
              showLabels={true}
              enableCrossFilter={true}
              crossFilterField="category"
            />
          </div>
        ) : null}
      </div>

      {/* Tables Grid: 2 columns on desktop, 1 column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Table 1: Pub count > 200K */}
        {shouldShowLoading ? (
          <DataTableSkeleton columns={pubCountOver200KColumns} rows={10} />
        ) : data?.pubCountOver200K ? (
          <div>
            <DataTable
              title="Pub count > 200K"
              columns={pubCountOver200KColumns}
              data={data.pubCountOver200K}
              crossFilterColumns={['partner', 'team', 'category']}
            />
          </div>
        ) : null}

        {/* Table 2: Pub count detail */}
        {shouldShowLoading ? (
          <DataTableSkeleton columns={pubCountDetailColumns} rows={10} />
        ) : data?.pubCountDetail ? (
          <div>
            <DataTable
              title="Pub count detail"
              columns={pubCountDetailColumns}
              data={data.pubCountDetail}
              crossFilterColumns={['partner', 'domain_app_id']}
            />
          </div>
        ) : null}
      </div>

      {!loading && !hasFilters && (
        <div className="p-8 text-center text-gray-500">
          <p>Please select a date to view data.</p>
        </div>
      )}

      {!loading && hasFilters && data && !data.pubCountTimeSeries && !data.categoryDistribution && !data.pubCountOver200K && !data.pubCountDetail && (
        <div className="p-8 text-center text-gray-500">
          <p>No data available for the selected filters.</p>
        </div>
      )}
    </AnalyticsPageLayout>
  )
}

export default function PartnerBreakdownPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PartnerBreakdownPageContent />
    </Suspense>
  )
}
