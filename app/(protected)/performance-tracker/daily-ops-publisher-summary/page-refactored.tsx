'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { colors } from '../../../../lib/colors'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { fetchAnalyticsData } from '../../../../lib/api/analytics'
import { FilterPanel } from '../../../components/performance-tracker/FilterPanel'
import { safeToFixed, safeNumber } from '../../../../lib/utils/formatters'
import type { FilterField } from '../../../../lib/types/analytics'
import type { ColumnConfig } from '../../../../lib/types/performanceTracker'

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

  // Initial data load
  useEffect(() => {
    fetchData({})
  }, [])

  // Clear all filters when switching tabs
  useEffect(() => {
    console.log('🔄 [TAB SWITCH] Clearing all filters for tab:', activeTab)

    // Clear cross-filters
    clearAllCrossFilters()

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

    const crossFilterValues = crossFilters.reduce((acc, filter) => {
      acc[filter.field] = filter.value
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

  // Revenue tier options (custom for Tab 1)
  const revenueTierOptions = [
    { label: '<10', value: '<10' },
    { label: '10–1000', value: '10–1000' },
    { label: '1001–3000', value: '1001–3000' },
    { label: '3001–10000', value: '3001–10000' },
    { label: '>10000', value: '>10000' },
  ]

  // Month and year options for Tab 3 (custom)
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
    value: String(i + 1)
  }))

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    label: String(currentYear - i),
    value: String(currentYear - i)
  }))

  // Tab 3 uses custom FilterPanel (not MetadataFilterPanel) due to month/year filters
  const tab3FilterConfig = [
    { name: 'month', label: 'Month', type: 'select' as const, options: monthOptions },
    { name: 'year', label: 'Year', type: 'select' as const, options: yearOptions },
  ]

  // Dynamic filter fields for MetadataFilterPanel based on active tab
  const currentMetadataFilterFields: FilterField[] =
    activeTab === 'publisher-media' ? ['team', 'pic'] as FilterField[] :
    activeTab === 'zones' ? ['team', 'pic', 'product'] as FilterField[] :
    ['pic'] as FilterField[]

  // Memoized filter change handler to prevent FilterPanel re-mounting event listeners
  const handleMetadataFilterChange = useCallback((filters: Record<string, any>) => {
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

  // Tab 1: Publisher & Media Summary - Column Definitions
  const publisherSummaryColumns: ColumnConfig[] = [
    { key: 'category', label: 'Category' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'pid', label: 'Count' },
  ]

  const publisherDetailColumns: ColumnConfig[] = [
    { key: 'pubname', label: 'Publisher Name' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'category', label: 'Category' },
    {
      key: 'projected_revenue',
      label: 'Projected Revenue',
      format: (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: 'last_month_revenue',
      label: 'Last Month Revenue',
      format: (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
  ]

  const mediaSummaryColumns: ColumnConfig[] = [
    { key: 'category', label: 'Category' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'mid', label: 'Count' },
  ]

  const mediaDetailColumns: ColumnConfig[] = [
    { key: 'medianame', label: 'Media Name' },
    { key: 'pubname', label: 'Publisher Name' },
    { key: 'revenue_tier', label: 'Revenue Tier' },
    { key: 'category', label: 'Category' },
    {
      key: 'projected_revenue',
      label: 'Projected Revenue',
      format: (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: 'last_month_revenue',
      label: 'Last Month Revenue',
      format: (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
  ]

  // Tab 2: Zone Operations - Column Definitions
  const newZonesColumns: ColumnConfig[] = [
    { key: 'zid', label: 'Zone ID' },
    { key: 'zonename', label: 'Zone Name' },
    { key: 'product', label: 'Product' },
    {
      key: 'req_yesterday',
      label: 'Requests Yesterday',
      format: (v) => Number(v).toLocaleString()
    },
    {
      key: 'rev_yesterday',
      label: 'Revenue Yesterday',
      format: (v) => `$${Number(v).toFixed(2)}`
    },
  ]

  const highTrafficZonesColumns: ColumnConfig[] = [
    { key: 'zid', label: 'Zone ID' },
    { key: 'zonename', label: 'Zone Name' },
    {
      key: 'req',
      label: 'Requests',
      format: (v) => Number(v).toLocaleString()
    },
    {
      key: 'rev',
      label: 'Revenue',
      format: (v) => `$${Number(v).toFixed(2)}`
    },
    {
      key: 'request_CPM',
      label: 'Request CPM',
      format: (v) => v ? `$${Number(v).toFixed(2)}` : 'N/A'
    },
  ]

  // Tab 3: Sales Tracking - Column Definitions
  const closeWonCasesColumns: ColumnConfig[] = [
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'pic', label: 'PIC' },
    { key: 'mid', label: 'Media ID' },
    { key: 'media_name', label: 'Media Name' },
    {
      key: 'day_start',
      label: 'Start Date',
      format: (v) => new Date(v).toLocaleDateString()
    },
    {
      key: 'close_won_day',
      label: 'Close Won Date',
      format: (v) => new Date(v).toLocaleDateString()
    },
    {
      key: 'total_req',
      label: 'Total Requests',
      format: (v) => Number(v).toLocaleString()
    },
    {
      key: 'total_profit',
      label: 'Total Profit',
      format: (v) => `$${Number(v).toFixed(2)}`
    },
    {
      key: 'total_revenue',
      label: 'Total Revenue',
      format: (v) => `$${Number(v).toFixed(2)}`
    },
  ]

  return (
    <AnalyticsPageLayout title="Daily Ops - Publisher Summary" showExport={true} contentRef={contentRef}>
      {/* Single MetadataFilterPanel outside Tabs for proper callback injection */}
      <MetadataFilterPanel
        page="publisher-summary"
        filterFields={currentMetadataFilterFields}
        onFilterChange={handleMetadataFilterChange}
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
            {/* Custom FilterPanel for revenue_tier */}
            <FilterPanel
              filters={[
                { name: 'revenue_tier', label: 'Revenue Tier', type: 'select', options: revenueTierOptions },
              ]}
              onFilterChange={(filters) => setTab1Filters(prev => ({ ...prev, ...filters }))}
              isLoading={loading}
            />

            {loading ? (
              <>
                <DataTableSkeleton columns={publisherSummaryColumns} />
                <DataTableSkeleton columns={publisherDetailColumns} />
                <DataTableSkeleton columns={mediaSummaryColumns} />
                <DataTableSkeleton columns={mediaDetailColumns} />
              </>
            ) : data ? (
              <>
                {/* Publisher Summary */}
                <DataTable
                  title="Churn and Active Publishers"
                  columns={publisherSummaryColumns}
                  data={data.publisherSummary || []}
                  crossFilterColumns={['category', 'revenue_tier']}
                />

                {/* Publisher Detail */}
                <DataTable
                  title="Churn and Active Publishers - Detail"
                  columns={publisherDetailColumns}
                  data={data.publisherDetail || []}
                  crossFilterColumns={['pubname', 'category', 'revenue_tier']}
                />

                {/* Media Summary */}
                <DataTable
                  title="Churn and Active Media"
                  columns={mediaSummaryColumns}
                  data={data.mediaSummary || []}
                  crossFilterColumns={['category', 'revenue_tier']}
                />

                {/* Media Detail */}
                <DataTable
                  title="Churn and Active Media - Detail"
                  columns={mediaDetailColumns}
                  data={data.mediaDetail || []}
                  crossFilterColumns={['medianame', 'pubname', 'category', 'revenue_tier']}
                />
              </>
            ) : null}
          </TabsContent>

          {/* Tab 2: Zone Operations */}
          <TabsContent value="zones" className="space-y-6">
            {loading ? (
              <>
                <DataTableSkeleton columns={newZonesColumns} />
                <DataTableSkeleton columns={highTrafficZonesColumns} />
              </>
            ) : data ? (
              <div className="grid grid-cols-1 gap-6">
                {/* New Zones Active */}
                <DataTable
                  title="New Zones Active"
                  columns={newZonesColumns}
                  data={data.newZones || []}
                  crossFilterColumns={['zid', 'zonename', 'product']}
                />

                {/* High Traffic Zones */}
                <DataTable
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
            {/* Custom filters (month, year) */}
            <FilterPanel
              filters={tab3FilterConfig}
              onFilterChange={(filters) => setTab3Filters(prev => ({ ...prev, ...filters }))}
              isLoading={loading}
            />

            {loading ? (
              <DataTableSkeleton columns={closeWonCasesColumns} />
            ) : data ? (
              <DataTable
                title="Close Won Cases"
                columns={closeWonCasesColumns}
                data={data.closeWonCases || []}
                crossFilterColumns={['pic', 'mid', 'media_name']}
              />
            ) : null}
          </TabsContent>
        </Tabs>
    </AnalyticsPageLayout>
  )
}
