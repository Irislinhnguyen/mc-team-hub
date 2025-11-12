'use client'

import { useState, useRef, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { PublisherCategoryBadge } from '../../../components/gcpp-check/PublisherCategoryBadge'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
import { DateSelector } from '../../../components/gcpp-check/DateSelector'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useGCPPFilters } from '../../../../lib/hooks'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { formatDate } from '../../../../lib/utils/formatters'
import { useGCPPMarketBreakdown } from '../../../../lib/hooks/queries/useGCPPMarketBreakdown'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'

function MarketBreakdownPageContent() {
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
  const { data: rawData, isLoading: loading } = useGCPPMarketBreakdown(filters)

  // Apply client-side filtering for cross-filters
  const { filteredData: filteredTop100ByMarket } = useClientSideFilterMulti(
    rawData?.top100ByMarket,
    crossFilters
  )
  const { filteredData: filteredPubCountByPartnerMarket } = useClientSideFilterMulti(
    rawData?.pubCountByPartnerMarket,
    crossFilters
  )
  const { filteredData: filteredPubCountBreakdown } = useClientSideFilterMulti(
    rawData?.pubCountBreakdown,
    crossFilters
  )

  // Combine filtered data
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      top100ByMarket: filteredTop100ByMarket,
      pubCountByPartnerMarket: filteredPubCountByPartnerMarket,
      pubCountBreakdown: filteredPubCountBreakdown,
    }
  }, [filteredTop100ByMarket, filteredPubCountByPartnerMarket, filteredPubCountBreakdown, rawData])

  // Show loading state when query is running OR when we have filters but no data yet
  const hasFilters = Object.keys(filters).length > 0
  const shouldShowLoading = loading || isDateSelectorLoading || (hasFilters && !data)

  // Column configurations
  const top100ByMarketColumns = [
    {
      key: 'date',
      label: 'Date',
      format: (value: any) => {
        if (!value) return ''
        return formatDate(value.value || value)
      }
    },
    { key: 'market', label: 'Market' },
    { key: 'domain_app_id', label: 'Domain/App ID' },
    { key: 'app_name', label: 'App Name' },
    { key: 'filtered_impressions', label: 'Impressions' },
    { key: 'category', label: 'Publisher Category' },
    { key: 'partner', label: 'Partner' },
    { key: 'all_partners', label: 'ALL partners' }
  ]

  const pubCountByPartnerMarketColumns = [
    { key: 'partner', label: 'Partner' },
    { key: 'market', label: 'Market' },
    { key: '<=200K', label: '<=200K' },
    { key: '>200K', label: '>200K' },
    { key: '>5M', label: '>5M' },
    { key: '>10M', label: '>10M' }
  ]

  const pubCountBreakdownColumns = [
    { key: 'category', label: 'Publisher Category' },
    { key: 'partner', label: 'Partner' },
    { key: 'domain_app_id', label: 'Domain/App ID' },
    { key: 'app_name', label: 'App Name' },
    { key: 'market', label: 'Market' },
    { key: 'total_impressions', label: 'Impressions' }
  ]


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

  const preparePivotDataByPartner = () => {
    if (!data?.pubCountByPartnerMarket) return []

    const pivot: Record<string, any> = {}

    data.pubCountByPartnerMarket.forEach((row: any) => {
      const key = `${row.partner}_${row.market}`
      if (!pivot[key]) {
        pivot[key] = {
          partner: row.partner,
          market: row.market,
          '<=200K': 0,
          '>200K': 0,
          '>5M': 0,
          '>10M': 0
        }
      }
      pivot[key][row.category] = row.pub_count
    })

    return Object.values(pivot)
  }

  const pivotDataByPartner = preparePivotDataByPartner()

  return (
    <AnalyticsPageLayout
      title="Market Breakdown"
      showExport={true}
      contentRef={contentRef}
    >
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

      {/* Filter Panel */}
      <MetadataFilterPanel
        page="gcpp-market-breakdown"
        filterFields={['team', 'market', 'domain_app_id', 'app_name', 'category']}
        onFilterChange={setMetadataFilters}
        isLoading={loading}
        metadataEndpoint="/api/gcpp-check/metadata"
        presetIdFromUrl={presetIdFromUrl || undefined}
      />

      {shouldShowLoading ? (
        <DataTableSkeleton columns={top100ByMarketColumns} rows={10} />
      ) : data?.top100ByMarket ? (
        <div className="mb-6">
          <DataTable
            title="Top 100 by market (pick a market)"
            columns={top100ByMarketColumns}
            data={data.top100ByMarket}
            crossFilterColumns={['market', 'partner', 'domain_app_id', 'category']}
          />
        </div>
      ) : null}

      {shouldShowLoading ? (
        <DataTableSkeleton columns={pubCountByPartnerMarketColumns} rows={10} />
      ) : pivotDataByPartner.length > 0 ? (
        <div className="mb-6">
          <DataTable
            title="Pub count by partner and market"
            columns={pubCountByPartnerMarketColumns}
            data={pivotDataByPartner}
            crossFilterColumns={['partner', 'market']}
          />
        </div>
      ) : null}

      {shouldShowLoading ? (
        <DataTableSkeleton columns={pubCountBreakdownColumns} rows={10} />
      ) : data?.pubCountBreakdown ? (
        <div className="mb-6">
          <DataTable
            title="Pub count breakdown"
            columns={pubCountBreakdownColumns}
            data={data.pubCountBreakdown}
            crossFilterColumns={['partner', 'market', 'domain_app_id', 'category']}
          />
        </div>
      ) : null}

      {!loading && !hasFilters && (
        <div className="p-8 text-center text-gray-500">
          <p>Please select a date to view data.</p>
        </div>
      )}

      {!loading && hasFilters && data && !data.top100ByMarket && !data.pubCountBreakdown && (
        <div className="p-8 text-center text-gray-500">
          <p>No data available for the selected filters.</p>
        </div>
      )}
    </AnalyticsPageLayout>
  )
}

export default function MarketBreakdownPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MarketBreakdownPageContent />
    </Suspense>
  )
}
