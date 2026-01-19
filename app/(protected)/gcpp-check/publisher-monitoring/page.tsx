'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { ScenarioBadge } from '../../../components/gcpp-check/ScenarioBadge'
import { PublisherCategoryBadge } from '../../../components/gcpp-check/PublisherCategoryBadge'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
import { DateSelector } from '../../../components/gcpp-check/DateSelector'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useGCPPFilters } from '../../../../lib/hooks'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { useGCPPPublisherMonitoring } from '../../../../lib/hooks/queries/useGCPPPublisherMonitoring'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'
import { formatStringValue, formatDateValue } from '../../../../lib/utils/formatters'

function PublisherMonitoringPageContent() {
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
  const { data: rawData, isLoading: loading } = useGCPPPublisherMonitoring(filters)

  // Apply client-side filtering for cross-filters
  const { filteredData: filteredSharedPubsMonitoring } = useClientSideFilterMulti(
    rawData?.sharedPubsMonitoring,
    crossFilters
  )
  const { filteredData: filteredSharedPubsDetails } = useClientSideFilterMulti(
    rawData?.sharedPubsDetails,
    crossFilters
  )
  const { filteredData: filteredNewPubsByPartner } = useClientSideFilterMulti(
    rawData?.newPubsByPartner,
    crossFilters
  )
  const { filteredData: filteredChurnedPubsByPartner } = useClientSideFilterMulti(
    rawData?.churnedPubsByPartner,
    crossFilters
  )

  // Combine filtered data
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      sharedPubsMonitoring: filteredSharedPubsMonitoring,
      sharedPubsDetails: filteredSharedPubsDetails,
      newPubsByPartner: filteredNewPubsByPartner,
      churnedPubsByPartner: filteredChurnedPubsByPartner,
    }
  }, [filteredSharedPubsMonitoring, filteredSharedPubsDetails, filteredNewPubsByPartner, filteredChurnedPubsByPartner, rawData])

  // Show loading state when query is running OR when we have filters but no data yet
  const hasFilters = Object.keys(filters).length > 0
  const shouldShowLoading = loading || isDateSelectorLoading || (hasFilters && !data)

  // Column configurations
  const newPubsByPartnerColumns = [
    { key: 'partner', label: 'Partner', format: formatStringValue },
    { key: 'domain_app_id', label: 'Domain/App ID', format: formatStringValue },
    { key: 'app_name', label: 'App Name', format: formatStringValue },
    { key: 'pub_size_category', label: 'Category', format: formatStringValue },
    { key: 'filtered_impressions', label: 'Impressions' },
    { key: 'team', label: 'Team', format: formatStringValue }
  ]

  // Dynamic columns for churned publishers with date labels
  const churnedPubsByPartnerColumns = useMemo(() => {
    const firstRow = data?.churnedPubsByPartner?.[0]
    const lastWeekDate = firstRow?.last_week_date || 'Last Week'
    const previousWeekDate = firstRow?.previous_week_date || 'Previous Week'

    return [
      { key: 'domain_app_id', label: 'Domain/App ID', format: formatStringValue },
      { key: 'app_name', label: 'App Name', format: formatStringValue },
      { key: 'partner', label: 'Partner', format: formatStringValue },
      { key: 'team', label: 'Team', format: formatStringValue },
      { key: 'last_week_impressions', label: lastWeekDate },
      { key: 'previous_week_impressions', label: previousWeekDate }
    ]
  }, [data?.churnedPubsByPartner])

  const sharedPubsMonitoringColumns = [
    { key: 'domain_app_id', label: 'Domain/App ID', format: formatStringValue },
    { key: 'app_name', label: 'App Name', format: formatStringValue },
    { key: 'latest_date', label: 'Latest Date', format: formatDateValue },
    { key: 'competitor_partner', label: 'Competitor', format: formatStringValue },
    { key: 'scenario', label: 'Scenario', format: formatStringValue },
    { key: 'action_guidance', label: 'Action Guidance', format: formatStringValue },
    { key: 'geniee_growth_pct', label: 'Geniee Growth %' },
    { key: 'competitor_growth_pct', label: 'Competitor Growth %' }
  ]

  const sharedPubsDetailsColumns = [
    { key: 'domain_app_id', label: 'Domain/App ID', format: formatStringValue },
    { key: 'app_name', label: 'App Name', format: formatStringValue },
    { key: 'latest_date', label: 'Latest Date', format: formatDateValue },
    { key: 'geniee_impressions_latest', label: 'Geniee Impr (Latest)' },
    { key: 'geniee_impressions_previous', label: 'Geniee Impr (Prev)' },
    { key: 'competitor_impressions_latest', label: 'Comp Impr (Latest)' },
    { key: 'competitor_impressions_previous', label: 'Comp Impr (Prev)' },
    { key: 'competitor_partner', label: 'Competitor', format: formatStringValue },
    { key: 'geniee_growth_pct', label: 'Geniee Growth %' },
    { key: 'competitor_growth_pct', label: 'Competitor Growth %' },
    { key: 'scenario', label: 'Scenario', format: formatStringValue }
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
      title="Publisher Monitoring - Opportunity"
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
        page="gcpp-publisher-monitoring"
        filterFields={['team', 'partner', 'pub_size_category', 'scenario', 'domain_app_id', 'app_name']}
        onFilterChange={setMetadataFilters}
        isLoading={loading}
        metadataEndpoint="/api/gcpp-check/metadata"
        presetIdFromUrl={presetIdFromUrl || undefined}
      />

      {/* Table 1: New pub by partner */}
      {shouldShowLoading ? (
        <DataTableSkeleton columns={newPubsByPartnerColumns} rows={10} />
      ) : data?.newPubsByPartner ? (
        <div className="mb-6">
          <DataTable
            title="New pub by partner"
            columns={newPubsByPartnerColumns}
            data={data.newPubsByPartner}
            crossFilterColumns={['partner', 'pub_size_category', 'team']}
          />
        </div>
      ) : null}

      {/* Table 2: Churned Publishers by Partner */}
      {shouldShowLoading ? (
        <DataTableSkeleton columns={churnedPubsByPartnerColumns} rows={10} />
      ) : data?.churnedPubsByPartner ? (
        <div className="mb-6">
          <DataTable
            title="Churned Publishers by Partner"
            columns={churnedPubsByPartnerColumns}
            data={data.churnedPubsByPartner}
            crossFilterColumns={['partner', 'team']}
          />
        </div>
      ) : null}

      {/* Table 3: Shared pubs monitoring */}
      {shouldShowLoading ? (
        <DataTableSkeleton columns={sharedPubsMonitoringColumns} rows={10} />
      ) : data?.sharedPubsMonitoring ? (
        <div className="mb-6">
          <DataTable
            title="Shared pubs monitoring"
            columns={sharedPubsMonitoringColumns}
            data={data.sharedPubsMonitoring}
            crossFilterColumns={['scenario', 'competitor_partner', 'domain_app_id']}
          />
        </div>
      ) : null}

      {/* Table 4: Shared pub monitoring details */}
      {shouldShowLoading ? (
        <DataTableSkeleton columns={sharedPubsDetailsColumns} rows={10} />
      ) : data?.sharedPubsDetails ? (
        <div className="mb-6">
          <DataTable
            title="Shared pub monitoring details"
            columns={sharedPubsDetailsColumns}
            data={data.sharedPubsDetails}
            crossFilterColumns={['scenario', 'competitor_partner', 'domain_app_id']}
          />
        </div>
      ) : null}

      {!loading && !hasFilters && (
        <div className="p-8 text-center text-gray-500">
          <p>Please select a date to view data.</p>
        </div>
      )}

      {!loading && hasFilters && data &&
       !data.newPubsByPartner &&
       !data.sharedPubsMonitoring &&
       !data.sharedPubsDetails && (
        <div className="p-8 text-center text-gray-500">
          <p>No data available for the selected filters.</p>
        </div>
      )}
    </AnalyticsPageLayout>
  )
}

export default function PublisherMonitoringPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PublisherMonitoringPageContent />
    </Suspense>
  )
}
