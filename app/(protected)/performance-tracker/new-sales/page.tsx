'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ToggleGroup, ToggleGroupItem } from '../../../../src/components/ui/toggle-group'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import ChartSkeleton from '../../../components/performance-tracker/skeletons/ChartSkeleton'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { TimeSeriesChart } from '../../../components/performance-tracker/TimeSeriesChart'
import { DatePresetButtons, DatePreset } from '../../../components/performance-tracker/DatePresetButtons'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { colors } from '../../../../lib/colors'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { useNewSales } from '../../../../lib/hooks/queries/useNewSales'
import { safeToFixed, safeNumber, formatDate } from '../../../../lib/utils/formatters'
import type { FilterField } from '../../../../lib/types/analytics'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'

/**
 * REFACTORED VERSION - New Sales Page
 *
 * Changes from original:
 * - Uses AnalyticsPageLayout for consistent structure
 * - Uses MetadataFilterPanel (eliminates ~80 lines of metadata handling)
 * - Uses React Query for caching (useNewSales hook)
 * - Added export functionality (contentRef)
 * - Proper loading skeletons
 * - Filter persistence via localStorage
 * - Cleaner, more maintainable code
 *
 * Cross-filter logic: KEPT AS-IS (not refactored per plan)
 * Custom table rendering: KEPT AS-IS (complex grouped table requirements)
 */

interface NewSalesData {
  allNewSales: any[]
  summaryTimeSeries: any[]
  summaryRevenue: any[]
  summaryProfit: any[]
  salesCsBreakdown: any[]
  salesCsBreakdownGrouped: any[]
  salesCsBreakdownTotals: {
    total_sales_rev: number
    total_sales_profit: number
    total_cs_rev: number
    total_cs_profit: number
  }
}

export default function NewSalesPage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const prevCrossFilterFieldsRef = useRef<string[]>([])
  const [activeTab, setActiveTab] = useState('summary')
  const [summaryFilters, setSummaryFilters] = useState<Record<string, any>>({})

  // Set initial date range for Details tab (last 30 days)
  const initialDetailsFilters = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  }
  const [detailsFilters, setDetailsFilters] = useState<Record<string, any>>(initialDetailsFilters)

  const [summaryPreset, setSummaryPreset] = useState<DatePreset>('all-time')
  const [detailsPreset, setDetailsPreset] = useState<DatePreset>('last-30-days')
  const { crossFilters, clearAllCrossFilters } = useCrossFilter()

  // Compute current filters based on active tab (memoized)
  const currentFilters = useMemo(() => {
    return activeTab === 'summary' ? summaryFilters : detailsFilters
  }, [activeTab, summaryFilters, detailsFilters])

  // Use React Query hook for data fetching and caching
  const { data: rawData, isLoading: loading, error } = useNewSales(currentFilters)

  // Apply client-side filtering for cross-filters (instant, no API call)
  const { filteredData: filteredAllNewSales } = useClientSideFilterMulti(
    rawData?.allNewSales,
    crossFilters
  )
  const { filteredData: filteredSummaryTimeSeries } = useClientSideFilterMulti(
    rawData?.summaryTimeSeries,
    crossFilters
  )
  const { filteredData: filteredSummaryRevenue } = useClientSideFilterMulti(
    rawData?.summaryRevenue,
    crossFilters
  )
  const { filteredData: filteredSummaryProfit } = useClientSideFilterMulti(
    rawData?.summaryProfit,
    crossFilters
  )
  const { filteredData: filteredSalesCsBreakdown } = useClientSideFilterMulti(
    rawData?.salesCsBreakdown,
    crossFilters
  )
  const { filteredData: filteredSalesCsBreakdownGrouped } = useClientSideFilterMulti(
    rawData?.salesCsBreakdownGrouped,
    crossFilters
  )

  // Combine filtered data
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      allNewSales: filteredAllNewSales,
      summaryTimeSeries: filteredSummaryTimeSeries,
      summaryRevenue: filteredSummaryRevenue,
      summaryProfit: filteredSummaryProfit,
      salesCsBreakdown: filteredSalesCsBreakdown,
      salesCsBreakdownGrouped: filteredSalesCsBreakdownGrouped,
      salesCsBreakdownTotals: rawData.salesCsBreakdownTotals,
    }
  }, [filteredAllNewSales, filteredSummaryTimeSeries, filteredSummaryRevenue, filteredSummaryProfit, filteredSalesCsBreakdown, filteredSalesCsBreakdownGrouped, rawData])

  // Clear all filters when switching tabs
  useEffect(() => {
    // Clear cross-filters
    clearAllCrossFilters()

    // Dispatch event to clear UI chips immediately
    window.dispatchEvent(new Event('clearAllAppliedFilters'))

    // Reset tab-specific filters
    if (activeTab === 'summary') {
      setSummaryFilters({})
      setSummaryPreset('all-time')
    } else if (activeTab === 'details') {
      // Reset Details tab with 30-day date range
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      setDetailsFilters({
        startDate: thirtyDaysAgo,
        endDate: today
      })
      setDetailsPreset('last-30-days')
    }
  }, [activeTab, clearAllCrossFilters])

  // Handle preset changes and update filters accordingly
  const handlePresetChange = (preset: DatePreset, isDetailsTab: boolean = false) => {
    const today = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (preset) {
      case 'all-time':
        startDate = undefined
        endDate = undefined
        break
      case 'last-30-days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'last-3-months':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'last-6-months':
        startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'custom':
        return
    }

    if (isDetailsTab) {
      setDetailsPreset(preset)
      setDetailsFilters(prev => {
        const newFilters = { ...prev }
        if (startDate && endDate) {
          newFilters.startDate = startDate
          newFilters.endDate = endDate
        } else {
          delete newFilters.startDate
          delete newFilters.endDate
        }
        return newFilters
      })
    } else {
      setSummaryPreset(preset)
      setSummaryFilters(prev => {
        const newFilters = { ...prev }
        if (startDate && endDate) {
          newFilters.startDate = startDate
          newFilters.endDate = endDate
        } else {
          delete newFilters.startDate
          delete newFilters.endDate
        }
        return newFilters
      })
    }
  }

  // Transform summary data for chart
  const transformTimeSeriesData = () => {
    if (!data?.summaryTimeSeries) return []

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]

    // Group by year/month
    const grouped = data.summaryTimeSeries.reduce((acc, row) => {
      const key = `${row.year}-${String(row.month).padStart(2, '0')}`
      if (!acc[key]) {
        acc[key] = {
          date: key,
          month: `${monthNames[row.month - 1]} ${row.year}`,
          WEB_GV: 0,
          WEB_GTI: 0,
          APP: 0,
          UNKNOWN: 0,
        }
      }
      acc[key][row.team] = (acc[key][row.team] || 0) + row.total_revenue
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date))
  }

  // Transform pivot table data
  const transformPivotData = (data: any[], metricKey: string) => {
    if (!data || data.length === 0) return []

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const teams = ['WEB_GV', 'WEB_GTI', 'APP', 'UNKNOWN']
    return teams.map(team => {
      const teamData = data.filter(row => row.team === team)
      const row: any = { team }

      teamData.forEach(d => {
        const monthKey = `${d.year}/${monthNames[d.month - 1]}`
        row[monthKey] = (row[monthKey] || 0) + d[metricKey]
      })

      return row
    }).filter(row => Object.keys(row).length > 1)
  }

  const chartData = transformTimeSeriesData()
  const revenueTableData = transformPivotData(data?.summaryRevenue || [], 'total_revenue')
  const profitTableData = transformPivotData(data?.summaryProfit || [], 'total_profit')

  // Add Grand Total row to Sales-CS Breakdown Grouped data
  const salesCsBreakdownGroupedWithTotal = (() => {
    if (!data?.salesCsBreakdownGrouped || !data?.salesCsBreakdownTotals) {
      return data?.salesCsBreakdownGrouped || []
    }

    const grandTotalRow = {
      pid: 'Grand total',
      pubname: '',
      start_date: '',
      end_date: '',
      month: '',
      year: '',
      sales_rev: data.salesCsBreakdownTotals.total_sales_rev,
      sales_profit: data.salesCsBreakdownTotals.total_sales_profit,
      cs_rev: data.salesCsBreakdownTotals.total_cs_rev,
      cs_profit: data.salesCsBreakdownTotals.total_cs_profit,
      isGrandTotal: true
    }

    return [...data.salesCsBreakdownGrouped, grandTotalRow]
  })()

  // Generate dynamic pivot table columns based on actual data
  const generatePivotColumns = (pivotData: any[]) => {
    if (!pivotData || pivotData.length === 0) {
      return [{ key: 'team', label: 'team' }]
    }

    const monthColumns = new Set<string>()
    pivotData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== 'team') {
          monthColumns.add(key)
        }
      })
    })

    // Sort columns chronologically
    const sortedColumns = Array.from(monthColumns).sort((a, b) => {
      const [yearA, monthA] = a.split('/')
      const [yearB, monthB] = b.split('/')
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndexA = monthNames.indexOf(monthA)
      const monthIndexB = monthNames.indexOf(monthB)

      if (yearA !== yearB) {
        return parseInt(yearB) - parseInt(yearA)  // Newest year first
      }
      return monthIndexB - monthIndexA  // Newest month first
    })

    return [
      { key: 'team', label: 'team' },
      ...sortedColumns.map(col => ({
        key: col,
        label: col,
        format: (v: number) => v ? safeToFixed(v, 2) : '-'
      }))
    ]
  }

  const revenuePivotColumns = generatePivotColumns(revenueTableData)
  const profitPivotColumns = generatePivotColumns(profitTableData)

  // Define columns for tables
  const allNewSalesColumns = [
    { key: 'pic', label: 'pic' },
    { key: 'pid', label: 'pid' },
    { key: 'pubname', label: 'pubname' },
    { key: 'start_date', label: 'start_date', format: (v: any) => formatDate(v?.value || v) },
    { key: 'end_date', label: 'end_date', format: (v: any) => formatDate(v?.value || v) },
    { key: 'rev_this_month', label: 'rev_this_month', format: (v: number) => v?.toFixed(2) || '0.00' },
    { key: 'profit_this_month', label: 'profit_this_month', format: (v: number) => v?.toFixed(2) || '0.00' },
    { key: 'rev_last_month', label: 'rev_last_month', format: (v: number) => v?.toFixed(2) || '0.00' },
    { key: 'profit_last_month', label: 'profit_last_month', format: (v: number) => v?.toFixed(2) || '0.00' },
  ]

  const salesCsBreakdownColumns = [
    { key: 'pid', label: 'pid' },
    { key: 'pubname', label: 'pubname' },
    { key: 'start_date', label: 'start_date', format: (v: any) => formatDate(v?.value || v) },
    { key: 'end_date', label: 'end_date', format: (v: any) => formatDate(v?.value || v) },
    { key: 'month', label: 'month' },
    { key: 'year', label: 'year' },
    { key: 'sales_rev', label: 'sales_rev', format: (v: number) => v?.toFixed(2) || '0.00' },
    { key: 'sales_profit', label: 'sales_profit', format: (v: number) => v?.toFixed(2) || '0.00' },
    { key: 'cs_rev', label: 'cs_rev', format: (v: number) => v?.toFixed(2) || '0.00' },
    { key: 'cs_profit', label: 'cs_profit', format: (v: number) => v?.toFixed(2) || '0.00' },
  ]

  // Columns for Sales-CS Breakdown Grouped (same as flat table)
  const salesCsBreakdownGroupedColumns = salesCsBreakdownColumns

  // Dynamic filter fields based on active tab
  const currentFilterFields: FilterField[] = activeTab === 'summary' ? ['team', 'pic'] as FilterField[] : ['daterange', 'team', 'pic', 'month', 'year'] as FilterField[]

  // Memoized filter change handler to prevent FilterPanel re-mounting event listeners
  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    if (activeTab === 'summary') {
      setSummaryFilters(prev => {
        // Preserve cross-filter fields (FilterPanel doesn't know about them)
        const preserved: Record<string, any> = {}
        prevCrossFilterFieldsRef.current.forEach(field => {
          if (prev[field] !== undefined) {
            preserved[field] = prev[field]
          }
        })
        const result = { ...filters, ...preserved }
        return result
      })
    } else {
      setDetailsFilters(prev => {
        // Preserve cross-filter fields (FilterPanel doesn't know about them)
        const preserved: Record<string, any> = {}
        prevCrossFilterFieldsRef.current.forEach(field => {
          if (prev[field] !== undefined) {
            preserved[field] = prev[field]
          }
        })
        const result = { ...filters, ...preserved }
        return result
      })
    }
  }, [activeTab])

  return (
    <AnalyticsPageLayout title="New Sales" showExport={true} contentRef={contentRef}>
      {/* Single MetadataFilterPanel outside Tabs for proper callback injection */}
      <MetadataFilterPanel
        page="new-sales"
        key={activeTab}
        filterFields={currentFilterFields}
        onFilterChange={handleFilterChange}
        isLoading={loading}
        defaultDateRange={activeTab === 'details' ? initialDetailsFilters : undefined}
      />

      {/* View Toggle */}
      <div className="flex items-center gap-4 px-4 mb-6">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => {
            if (value) setActiveTab(value)
          }}
        >
          <ToggleGroupItem value="summary">Summary</ToggleGroupItem>
          <ToggleGroupItem value="details">Details</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="w-full">
        {/* Tab 1: Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
          <DatePresetButtons
            selectedPreset={summaryPreset}
            onPresetChange={(preset) => handlePresetChange(preset, false)}
          />

            {/* Summary Content */}
            <div className="space-y-6">
              {loading ? (
                <>
                  <ChartSkeleton />
                  <DataTableSkeleton columns={revenuePivotColumns} rows={5} />
                  <DataTableSkeleton columns={profitPivotColumns} rows={5} />
                </>
              ) : data ? (
                <>
                  <TimeSeriesChart
                    title="New sales summary"
                    data={chartData}
                    lines={[
                      { dataKey: 'WEB_GV', name: 'WEB_GV', color: colors.main },
                      { dataKey: 'WEB_GTI', name: 'WEB_GTI', color: colors.accent },
                      { dataKey: 'APP', name: 'APP', color: '#10B981' },
                      { dataKey: 'UNKNOWN', name: 'UNKNOWN', color: '#6B7280' },
                    ]}
                    enableCrossFilter={false}
                    dateKey="month"
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6 [&>*]:min-w-0">
                    <DataTable
                      title="New sales summary_Revenue"
                      columns={revenuePivotColumns}
                      data={revenueTableData}
                      pageSize={10}
                      enableCrossFilter={false}
                    />

                    <DataTable
                      title="New sales summary_Profit"
                      columns={profitPivotColumns}
                      data={profitTableData}
                      pageSize={10}
                      enableCrossFilter={false}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Tab 2: Details */}
        {activeTab === 'details' && (
          <div className="space-y-6">
          {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> Use the date range picker above to filter the "all new sales over time" table by start_date and end_date.
              </p>
            </div>

          {/* All New Sales Over Time Table */}
          {loading ? (
            <DataTableSkeleton columns={allNewSalesColumns} rows={10} />
          ) : (
            <DataTable
              key="all-new-sales"
              title="All new sales over time"
              columns={allNewSalesColumns}
              data={data?.allNewSales || []}
              pageSize={100}
              enableCrossFilter={true}
              crossFilterColumns={['pic', 'pid', 'pubname']}
            />
          )}

          {/* Sales-CS Breakdown Grouped */}
          {loading ? (
            <DataTableSkeleton columns={salesCsBreakdownGroupedColumns} rows={10} />
          ) : (
            <DataTable
              key="sales-cs-breakdown"
              title="Sales-Cs breakdown"
              columns={salesCsBreakdownGroupedColumns}
              data={salesCsBreakdownGroupedWithTotal}
              pageSize={100}
              enableCrossFilter={true}
              crossFilterColumns={['pid', 'pubname', 'month', 'year']}
              hideRepeatedColumns={['pid', 'pubname', 'start_date', 'end_date']}
              groupByColumns={['pid']}
            />
          )}
          </div>
        )}
      </div>
    </AnalyticsPageLayout>
  )
}
