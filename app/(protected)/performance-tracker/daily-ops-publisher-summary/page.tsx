'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { LazyDataTable } from '../../../components/performance-tracker/LazyDataTable'
import { LazyDataTableSkeleton } from '../../../components/performance-tracker/skeletons/LazyDataTableSkeleton'
import { colors } from '../../../../lib/colors'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { fetchAnalyticsData } from '../../../../lib/api/analytics'
import { FilterPanel } from '../../../components/performance-tracker/FilterPanel'
import { safeToFixed, safeNumber, formatDate } from '../../../../lib/utils/formatters'
import type { FilterField } from '../../../../lib/types/analytics'

/**
 * REFACTORED VERSION - Daily Ops Publisher Summary Page
 *
 * Changes from original:
 * - Uses AnalyticsPageLayout for consistent structure
 * - Uses MetadataFilterPanel for standard filters (team, pic, product)
 * - Uses fetchAnalyticsData API helper
 * - Added export functionality (contentRef)
 * - Proper loading skeletons
 * - Cleaner, more maintainable code
 *
 * Cross-filter logic: KEPT AS-IS (not refactored per plan)
 * Custom filters (revenue_tier, month, year): KEPT AS-IS (tab-specific requirements)
 */

export default function DailyOpsPublisherSummaryPage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('publisher-media')

  // Separate filters for each tab
  const [tab1Filters, setTab1Filters] = useState<Record<string, any>>({})
  const [tab2Filters, setTab2Filters] = useState<Record<string, any>>({})
  const [tab3Filters, setTab3Filters] = useState<Record<string, any>>({})
  const [filterVersion, setFilterVersion] = useState(0)

  const { crossFilters, clearAllCrossFilters } = useCrossFilter()
  const prevCrossFilterFieldsRef = useRef<string[]>([])

  // Column configurations
  const publisherSummaryColumns = [
    { key: 'category', label: 'Category' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'pid', label: 'Count' },
  ]

  const publisherDetailColumns = [
    { key: 'pubname', label: 'Publisher Name' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'category', label: 'Category' },
    { key: 'projected_revenue', label: 'Projected Revenue', format: (v: any) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'last_month_revenue', label: 'Last Month Revenue', format: (v: any) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  ]

  const mediaSummaryColumns = [
    { key: 'category', label: 'Category' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'mid', label: 'Count' },
  ]

  const mediaDetailColumns = [
    { key: 'medianame', label: 'Media Name' },
    { key: 'pubname', label: 'Publisher Name' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'category', label: 'Category' },
    { key: 'projected_revenue', label: 'Projected Revenue', format: (v: any) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'last_month_revenue', label: 'Last Month Revenue', format: (v: any) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  ]

  const newZonesColumns = [
    { key: 'zid', label: 'Zone ID' },
    { key: 'zonename', label: 'Zone Name' },
    { key: 'product', label: 'Product' },
    { key: 'req_yesterday', label: 'Requests Yesterday', format: (v: any) => Number(v).toLocaleString() },
    { key: 'rev_yesterday', label: 'Revenue Yesterday', format: (v: any) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  ]

  const highTrafficZonesColumns = [
    { key: 'zid', label: 'Zone ID' },
    { key: 'zonename', label: 'Zone Name' },
    { key: 'req', label: 'Requests', format: (v: any) => Number(v).toLocaleString() },
    { key: 'rev', label: 'Revenue', format: (v: any) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  ]

  const closeWonColumns = [
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'pic', label: 'PIC' },
    { key: 'mid', label: 'Media ID' },
    { key: 'media_name', label: 'Media Name' },
    { key: 'day_start', label: 'Start Date', format: (v: any) => { if (!v) return '-'; return formatDate(v.value || v) } },
    { key: 'deal_stage', label: 'Deal Stage' },
  ]

  // Clear all filters when switching tabs
  useEffect(() => {
    // Clear cross-filters
    clearAllCrossFilters()

    // Dispatch event to clear UI chips immediately
    window.dispatchEvent(new Event('clearAllAppliedFilters'))

    // Reset tab-specific filters to initial state (empty)
    if (activeTab === 'publisher-media') {
      setTab1Filters({})
    } else if (activeTab === 'zones') {
      setTab2Filters({})
    } else if (activeTab === 'sales') {
      setTab3Filters({})
    }
  }, [activeTab, clearAllCrossFilters])

  // Apply cross-filters
  useEffect(() => {
    // CRITICAL: Save old fields BEFORE updating ref
    const oldFields = [...prevCrossFilterFieldsRef.current]

    // Group cross-filters by field to support multiple values
    const crossFilterValues = crossFilters.reduce((acc, filter) => {
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

    const updateFilters = (prev: Record<string, any>) => {
      // Remove old cross-filter fields using SAVED old fields
      const cleaned = { ...prev }
      oldFields.forEach(field => {
        delete cleaned[field]
      })
      // Add new cross-filter values
      return { ...cleaned, ...crossFilterValues }
    }

    // Update ref with current cross-filter fields
    prevCrossFilterFieldsRef.current = crossFilters.map(f => f.field)

    // Apply to current active tab
    if (activeTab === 'publisher-media') {
      setTab1Filters(prev => updateFilters(prev))
    } else if (activeTab === 'zones') {
      setTab2Filters(prev => updateFilters(prev))
    } else if (activeTab === 'sales') {
      setTab3Filters(prev => updateFilters(prev))
    }

    // Force refetch by incrementing version counter
    setFilterVersion(v => v + 1)
  }, [crossFilters, activeTab])

  // Fetch data when filters change or tab changes
  useEffect(() => {
    const currentFilters =
      activeTab === 'publisher-media' ? tab1Filters :
      activeTab === 'zones' ? tab2Filters :
      tab3Filters

    fetchDataWrapper(currentFilters)
  }, [tab1Filters, tab2Filters, tab3Filters, activeTab, filterVersion])

  const fetchDataWrapper = async (filters: Record<string, any>) => {
    setLoading(true)
    try {
      const result = await fetchAnalyticsData('/api/performance-tracker/daily-ops-publisher-summary', filters)
      setData(result)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = fetchDataWrapper

  // Dynamic filter fields based on active tab
  const currentFilterFields: FilterField[] =
    activeTab === 'publisher-media' ? ['revenue_tier', 'team', 'pic'] as FilterField[] :
    activeTab === 'zones' ? ['team', 'pic', 'product'] as FilterField[] :
    ['team', 'pic', 'month', 'year'] as FilterField[]

  // Memoized filter change handler to prevent FilterPanel re-mounting event listeners
  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    if (activeTab === 'publisher-media') {
      setTab1Filters(prev => {
        // Preserve cross-filter fields (FilterPanel doesn't know about them)
        const preserved: Record<string, any> = {}
        prevCrossFilterFieldsRef.current.forEach(field => {
          if (prev[field] !== undefined) {
            preserved[field] = prev[field]
          }
        })
        return { ...filters, ...preserved }
      })
    } else if (activeTab === 'zones') {
      setTab2Filters(prev => {
        // Preserve cross-filter fields (FilterPanel doesn't know about them)
        const preserved: Record<string, any> = {}
        prevCrossFilterFieldsRef.current.forEach(field => {
          if (prev[field] !== undefined) {
            preserved[field] = prev[field]
          }
        })
        return { ...filters, ...preserved }
      })
    } else {
      setTab3Filters(prev => {
        // Preserve cross-filter fields (FilterPanel doesn't know about them)
        const preserved: Record<string, any> = {}
        prevCrossFilterFieldsRef.current.forEach(field => {
          if (prev[field] !== undefined) {
            preserved[field] = prev[field]
          }
        })
        return { ...filters, ...preserved }
      })
    }
  }, [activeTab])

  return (
    <AnalyticsPageLayout title="Daily Ops - Publisher Summary" showExport={true} contentRef={contentRef}>
      {/* Single MetadataFilterPanel outside Tabs for proper callback injection */}
      <MetadataFilterPanel
        page="publisher-summary"
        filterFields={currentFilterFields}
        onFilterChange={handleFilterChange}
        isLoading={loading}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="publisher-media">Publisher & Media Summary</TabsTrigger>
            <TabsTrigger value="zones">Zone Operations</TabsTrigger>
            <TabsTrigger value="sales">Sales Tracking</TabsTrigger>
          </TabsList>

          {/* Tab 1: Publisher & Media Summary */}
          <TabsContent value="publisher-media" className="space-y-6">

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
                <LazyDataTableSkeleton columns={publisherSummaryColumns} rows={7} />
                <LazyDataTableSkeleton columns={publisherDetailColumns} rows={7} />
                <LazyDataTableSkeleton columns={mediaSummaryColumns} rows={7} />
                <LazyDataTableSkeleton columns={mediaDetailColumns} rows={7} />
              </div>
            ) : data ? (
              <>
                {/* Publisher Row - 2 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
                  {/* Publisher Summary */}
                  <LazyDataTable
                    title="Churn and Active Publishers"
                    columns={publisherSummaryColumns}
                    data={data.publisherSummary || []}
                    crossFilterColumns={['category', 'revenue_tier']}
                  />

                  {/* Publisher Detail */}
                  <LazyDataTable
                    title="Churn and Active Publishers - Detail"
                    columns={publisherDetailColumns}
                    data={data.publisherDetail || []}
                    crossFilterColumns={['pubname', 'category', 'revenue_tier']}
                  />
                </div>

                {/* Media Row - 2 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
                  {/* Media Summary */}
                  <LazyDataTable
                    title="Churn and Active Media"
                    columns={mediaSummaryColumns}
                    data={data.mediaSummary || []}
                    crossFilterColumns={['category', 'revenue_tier']}
                  />

                  {/* Media Detail */}
                  <LazyDataTable
                    title="Churn and Active Media - Detail"
                    columns={mediaDetailColumns}
                    data={data.mediaDetail || []}
                    crossFilterColumns={['medianame', 'pubname', 'category', 'revenue_tier']}
                  />
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* Tab 2: Zone Operations */}
          <TabsContent value="zones" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-6">
                <LazyDataTableSkeleton columns={newZonesColumns} rows={7} />
                <LazyDataTableSkeleton columns={highTrafficZonesColumns} rows={7} />
              </div>
            ) : data ? (
              <div className="grid grid-cols-1 gap-6">
                {/* New Zones Active */}
                <LazyDataTable
                  title="New Zones Active"
                  columns={newZonesColumns}
                  data={data.newZones || []}
                  crossFilterColumns={['zid', 'zonename', 'product']}
                />

                {/* High Traffic Zones */}
                <LazyDataTable
                  title="50k Ad Request Zones (Yesterday, >50k requests)"
                  columns={highTrafficZonesColumns}
                  data={data.highTrafficZones || []}
                  crossFilterColumns={['zid', 'zonename']}
                />
              </div>
            ) : null}
          </TabsContent>

          {/* Tab 3: Sales Tracking */}
          <TabsContent value="sales" className="space-y-6">
            {loading ? (
              <LazyDataTableSkeleton columns={closeWonColumns} rows={7} />
            ) : data ? (
              <LazyDataTable
                title="Close Won Cases"
                columns={closeWonColumns}
                data={data.closeWonCases || []}
                crossFilterColumns={['pic', 'mid', 'media_name']}
              />
            ) : null}
          </TabsContent>
        </Tabs>
    </AnalyticsPageLayout>
  )
}
