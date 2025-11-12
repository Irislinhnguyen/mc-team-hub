'use client'

import { useState, useRef, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { PerformanceIndicator } from '../../../components/gcpp-check/PerformanceIndicator'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
import { DateSelector } from '../../../components/gcpp-check/DateSelector'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useGCPPFilters } from '../../../../lib/hooks'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { useGCPPPartnerBreakdown2 } from '../../../../lib/hooks/queries/useGCPPPartnerBreakdown2'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'

function PartnerBreakdown2PageContent() {
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
  const { data: rawData, isLoading: loading } = useGCPPPartnerBreakdown2(filters)

  // Apply client-side filtering for cross-filters
  const { filteredData: filteredTop100ByPartner } = useClientSideFilterMulti(
    rawData?.top100ByPartner,
    crossFilters
  )
  const { filteredData: filteredTopPubsByPartnerMarket } = useClientSideFilterMulti(
    rawData?.topPubsByPartnerMarket,
    crossFilters
  )
  const { filteredData: filteredGenieeWallet } = useClientSideFilterMulti(
    rawData?.genieeWallet,
    crossFilters
  )

  // Combine filtered data
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      top100ByPartner: filteredTop100ByPartner,
      topPubsByPartnerMarket: filteredTopPubsByPartnerMarket,
      genieeWallet: filteredGenieeWallet,
    }
  }, [filteredTop100ByPartner, filteredTopPubsByPartnerMarket, filteredGenieeWallet, rawData])

  // Debug logging
  console.log('Partner Breakdown 2 Debug:', {
    filters,
    hasData: !!data,
    top100Count: data?.top100ByPartner?.length || 0,
    topPubsCount: data?.topPubsByPartnerMarket?.length || 0,
    walletCount: data?.genieeWallet?.length || 0,
    loading
  })

  // Show loading state when query is running OR when we have filters but no data yet
  const hasFilters = Object.keys(filters).length > 0
  const shouldShowLoading = loading || isDateSelectorLoading || (hasFilters && !data)

  // Column configurations
  const top100ByPartnerColumns = [
    { key: 'rank', label: 'Rank' },
    { key: 'partner', label: 'Partner' },
    { key: 'domain_app_id', label: 'Domain/App ID' },
    { key: 'app_name', label: 'App Name' },
    { key: 'filtered_impressions', label: 'Impressions' },
    { key: 'date', label: 'Date' }
  ]

  const topPubsByPartnerMarketColumns = [
    { key: 'domain_app_id', label: 'Domain/App ID' },
    { key: 'app_name', label: 'App Name' },
    { key: 'prev_impressions', label: 'Prev Impressions' },
    {
      key: 'performance',
      label: 'Performance',
      format: (value: any) => value ? <PerformanceIndicator performance={value} /> : null
    },
    { key: 'market', label: 'Market' },
    { key: 'filtered_impressions', label: 'Current Impressions' },
    { key: 'partner', label: 'Partner' },
    { key: 'team', label: 'Team' }
  ]

  const genieeWalletColumns = [
    { key: 'date', label: 'Date' },
    { key: 'domain_app_id', label: 'Domain/App ID' },
    { key: 'app_name', label: 'App Name' },
    { key: 'geniee_impressions', label: 'Geniee Impressions' },
    { key: 'total_impressions', label: 'Total Impressions' },
    { key: 'impressions_percentage', label: 'Wallet Share %' }
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

  return (
    <AnalyticsPageLayout
      title="Partner Breakdown - Part 2"
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
          onLoadingChange={setIsDateSelectorLoading}
          initialDate={selectedDate}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      </div>

      {/* Filter Panel */}
      <MetadataFilterPanel
        page="gcpp-partner-breakdown-2"
        filterFields={['team', 'partner', 'market', 'domain_app_id', 'app_name', 'performance']}
        onFilterChange={setMetadataFilters}
        isLoading={loading}
        metadataEndpoint="/api/gcpp-check/metadata"
        presetIdFromUrl={presetIdFromUrl || undefined}
      />

      {/* Table 1: Top 100 by partner (all market) */}
      {shouldShowLoading ? (
        <DataTableSkeleton columns={top100ByPartnerColumns} rows={10} />
      ) : data?.top100ByPartner ? (
        <div className="mb-6">
          <DataTable
            title="Top 100 by partner (all market) - pick a date"
            columns={top100ByPartnerColumns}
            data={data.top100ByPartner}
            crossFilterColumns={['partner', 'domain_app_id']}
          />
        </div>
      ) : null}

      {/* Table 2: Top pubs by partner and market */}
      {shouldShowLoading ? (
        <DataTableSkeleton columns={topPubsByPartnerMarketColumns} rows={10} />
      ) : data?.topPubsByPartnerMarket && data.topPubsByPartnerMarket.length > 0 ? (
        <div className="mb-6">
          <DataTable
            title="Top pubs by partner and market"
            columns={topPubsByPartnerMarketColumns}
            data={data.topPubsByPartnerMarket}
            crossFilterColumns={['partner', 'market', 'domain_app_id', 'performance']}
          />
        </div>
      ) : data && hasFilters ? (
        <div className="mb-6 p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-blue-800 font-medium mb-2">No data for "Top pubs by partner and market"</p>
          <p className="text-blue-600 text-sm">Try selecting a <strong>market</strong> filter or click on a row in the first table to see detailed breakdown.</p>
        </div>
      ) : null}

      {/* Table 3: Geniee Publisher's wallet */}
      {shouldShowLoading ? (
        <DataTableSkeleton columns={genieeWalletColumns} rows={10} />
      ) : data?.genieeWallet ? (
        <div className="mb-6">
          <DataTable
            title="Geniee Publisher's wallet"
            columns={genieeWalletColumns}
            data={data.genieeWallet}
            crossFilterColumns={['domain_app_id']}
          />
        </div>
      ) : null}

      {!loading && !hasFilters && (
        <div className="p-8 text-center text-gray-500">
          <p>Please select a date to view data.</p>
        </div>
      )}

      {!loading && hasFilters && data && !data.top100ByPartner && !data.topPubsByPartnerMarket && !data.genieeWallet && (
        <div className="p-8 text-center text-gray-500">
          <p>No data available for the selected filters.</p>
        </div>
      )}
    </AnalyticsPageLayout>
  )
}

export default function PartnerBreakdown2Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PartnerBreakdown2PageContent />
    </Suspense>
  )
}
