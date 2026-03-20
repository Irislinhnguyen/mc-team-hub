'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MetadataFilterPanel } from '@/components/performance-tracker/MetadataFilterPanel'
import ChartSkeleton from '@/components/performance-tracker/skeletons/ChartSkeleton'
import { DataTableSkeleton } from '@/components/performance-tracker/skeletons/DataTableSkeleton'
import { DataTable } from '@/components/performance-tracker/DataTable'
import { TimeSeriesChart } from '@/components/performance-tracker/TimeSeriesChart'
import { DatePresetButtons, DatePreset } from '@/components/performance-tracker/DatePresetButtons'
import { useCrossFilter } from '@/app/contexts/CrossFilterContext'
import { colors } from '@/lib/colors'
import { AnalyticsPageLayout } from '@/components/performance-tracker/AnalyticsPageLayout'
import { useNewSales } from '@/lib/hooks/queries/useNewSales'
import { safeToFixed, safeNumber, formatDate } from '@/lib/utils/formatters'
import type { FilterField } from '@/lib/types/analytics'
import { useClientSideFilterMulti } from '@/lib/hooks/useClientSideFilter'

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
  salesCsSiteCountsByPic: any[]
  salesCsSiteDetails: any[]
}

export default function NewSalesPage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const prevCrossFilterFieldsRef = useRef<string[]>([])
  const [activeTab, setActiveTab] = useState('summary')

  // Simplified: One filter set per tab (team, pic, etc.)
  const [summaryFilters, setSummaryFilters] = useState<Record<string, any>>({})
  const [detailsFilters, setDetailsFilters] = useState<Record<string, any>>({})

  // Helper function to format date as YYYY-MM-DD using local time (no timezone shift)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function to calculate date range from preset (must be defined before useState)
  const calculateDateRange = useCallback((preset: DatePreset): Record<string, any> => {
    const today = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (preset) {
      case 'all-time':
        return {}
      case 'this-month':
        // Start of current month to today
        startDate = formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 1))
        endDate = formatDateLocal(today)
        break
      case 'last-month':
        // Previous month (full month)
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
        startDate = formatDateLocal(prevMonth)
        endDate = formatDateLocal(lastDayOfPrevMonth)
        break
      case 'last-30-days':
        startDate = formatDateLocal(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        endDate = formatDateLocal(today)
        break
      case 'last-3-months':
        // First day of 3 months ago to last day of previous month
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1)
        const lastDayOfPrevMonthFor3 = new Date(today.getFullYear(), today.getMonth(), 0)
        startDate = formatDateLocal(threeMonthsAgo)
        endDate = formatDateLocal(lastDayOfPrevMonthFor3)
        break
      case 'last-6-months':
        // First day of 6 months ago to last day of previous month
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1)
        const lastDayOfPrevMonthFor6 = new Date(today.getFullYear(), today.getMonth(), 0)
        startDate = formatDateLocal(sixMonthsAgo)
        endDate = formatDateLocal(lastDayOfPrevMonthFor6)
        break
      case 'custom':
        return {}
    }

    return { startDate, endDate }
  }, [])

  // Date range state for summary tab (applies to all summary data)
  const [summaryDatePreset, setSummaryDatePreset] = useState<DatePreset>('all-time')
  const [summaryDateRange, setSummaryDateRange] = useState<Record<string, any>>(calculateDateRange('all-time'))

  // Date range state for details tab
  const [detailsPreset, setDetailsPreset] = useState<DatePreset>('all-time')
  const [detailsDateRange, setDetailsDateRange] = useState<Record<string, any>>(calculateDateRange('all-time'))

  const { crossFilters, clearAllCrossFilters } = useCrossFilter()

  // Combine team/PIC filters with date range for Summary tab
  // For custom preset, only apply date filter when both dates are filled
  const summaryFiltersWithDate = useMemo(() => {
    const filters = { ...summaryFilters }
    // Only apply date range if it's not custom preset, or if custom and both dates are filled
    if (summaryDatePreset !== 'custom' || (summaryDateRange.startDate && summaryDateRange.endDate)) {
      filters.startDate = summaryDateRange.startDate
      filters.endDate = summaryDateRange.endDate
    }
    return filters
  }, [summaryFilters, summaryDateRange, summaryDatePreset])

  // Combine team/PIC filters with date range for Details tab
  // For custom preset, only apply date filter when both dates are filled
  const detailsFiltersWithDate = useMemo(() => {
    const filters = { ...detailsFilters }
    // Only apply date range if it's not custom preset, or if custom and both dates are filled
    if (detailsPreset !== 'custom' || (detailsDateRange.startDate && detailsDateRange.endDate)) {
      filters.startDate = detailsDateRange.startDate
      filters.endDate = detailsDateRange.endDate
    }
    return filters
  }, [detailsFilters, detailsDateRange, detailsPreset])

  // Use React Query hook for data fetching and caching
  const { data: rawData, isLoading: loading, error } = useNewSales(
    activeTab === 'summary' ? summaryFiltersWithDate : detailsFiltersWithDate
  )

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
  const { filteredData: filteredSalesCsSiteCountsByPic } = useClientSideFilterMulti(
    rawData?.salesCsSiteCountsByPic,
    crossFilters
  )
  const { filteredData: filteredSalesCsSiteDetails } = useClientSideFilterMulti(
    rawData?.salesCsSiteDetails,
    crossFilters
  )

  // Combine filtered data - site count uses same date range as other summary data
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
      salesCsSiteCountsByPic: filteredSalesCsSiteCountsByPic,
      salesCsSiteDetails: filteredSalesCsSiteDetails,
    }
  }, [filteredAllNewSales, filteredSummaryTimeSeries, filteredSummaryRevenue, filteredSummaryProfit, filteredSalesCsBreakdown, filteredSalesCsBreakdownGrouped, filteredSalesCsSiteCountsByPic, filteredSalesCsSiteDetails, rawData])

  // Clear cross-filters when switching tabs (but preserve tab-specific filters)
  useEffect(() => {
    clearAllCrossFilters()
    window.dispatchEvent(new Event('clearAllAppliedFilters'))
  }, [activeTab, clearAllCrossFilters])

  // Sync date range with preset - ensures they're always aligned
  // This prevents state desynchronization where preset and range could get out of sync
  useEffect(() => {
    if (summaryDatePreset !== 'custom') {
      setSummaryDateRange(calculateDateRange(summaryDatePreset))
    }
  }, [summaryDatePreset, calculateDateRange])

  // Handle date preset changes for Summary tab
  const handleSummaryPresetChange = (preset: DatePreset) => {
    setSummaryDatePreset(preset)
    // For custom preset, don't apply the filter yet - wait for user to fill in dates
    if (preset !== 'custom') {
      setSummaryDateRange(calculateDateRange(preset))
    }
  }

  // Handle date preset changes for Details tab
  const handleDetailsPresetChange = (preset: DatePreset) => {
    setDetailsPreset(preset)
    // For custom preset, don't apply the filter yet - wait for user to fill in dates
    if (preset !== 'custom') {
      setDetailsDateRange(calculateDateRange(preset))
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

  // Transform site count data - aggregate by team
  // Aggregates from the filtered Details table data (source of truth)
  // Counts sites based on sales_month/cs_month matching the target months
  const transformSiteCountByTeam = (data: any[], targetMonths?: Set<string>) => {
    if (!data || data.length === 0) return []

    const teamMap = new Map<string, { total_sales_sites: number; total_cs_sites: number }>()

    data.forEach(row => {
      // When targetMonths is undefined (all-time), include all sites
      // Otherwise, filter by sales_month/cs_month matching target months
      const isSales = targetMonths ? targetMonths.has(row.sales_month) : true
      const isCs = targetMonths ? targetMonths.has(row.cs_month) : true

      // Skip if neither matches (when filtering by specific months)
      if (targetMonths && !isSales && !isCs) return

      if (!teamMap.has(row.team)) {
        teamMap.set(row.team, { total_sales_sites: 0, total_cs_sites: 0 })
      }
      const teamData = teamMap.get(row.team)!

      // Prioritize Sales if both match (should be rare)
      if (isSales) {
        teamData.total_sales_sites += 1
      } else if (isCs) {
        teamData.total_cs_sites += 1
      }
    })

    return Array.from(teamMap.entries()).map(([team, counts]) => ({
      team,
      total_sales_sites: counts.total_sales_sites,
      total_cs_sites: counts.total_cs_sites,
    }))
  }

  // Transform site count data - aggregate by PIC
  // Aggregates from the filtered Details table data (source of truth)
  // Counts sites based on sales_month/cs_month matching the target months
  const transformSiteCountByPic = (data: any[], targetMonths?: Set<string>) => {
    if (!data || data.length === 0) return []

    const picMap = new Map<string, { team: string; pic: string; total_sales_sites: number; total_cs_sites: number }>()

    data.forEach(row => {
      // When targetMonths is undefined (all-time), include all sites
      // Otherwise, filter by sales_month/cs_month matching target months
      const isSales = targetMonths ? targetMonths.has(row.sales_month) : true
      const isCs = targetMonths ? targetMonths.has(row.cs_month) : true

      // Skip if neither matches (when filtering by specific months)
      if (targetMonths && !isSales && !isCs) return

      const key = `${row.team}_${row.pic}`
      if (!picMap.has(key)) {
        picMap.set(key, { team: row.team, pic: row.pic, total_sales_sites: 0, total_cs_sites: 0 })
      }
      const picData = picMap.get(key)!

      // Prioritize Sales if both match (should be rare)
      if (isSales) {
        picData.total_sales_sites += 1
      } else if (isCs) {
        picData.total_cs_sites += 1
      }
    })

    return Array.from(picMap.entries()).map(([, counts]) => ({
      team: counts.team,
      pic: counts.pic,
      total_sales_sites: counts.total_sales_sites,
      total_cs_sites: counts.total_cs_sites,
    }))
  }

  // Helper to format date as "Mon YYYY"
  const formatDateToMonthYear = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
  }

  // Transform raw breakdown data for details view - add sales_month and cs_month columns
  // Sales Month: month of the start_date (when sales phase begins)
  // CS Month: month of (end_date + 1 day) (when CS phase begins)
  // FILTERING: Only show sites where sales_month OR cs_month falls within the date range
  // This is the SOURCE OF TRUTH - the Details table determines what gets counted
  const transformSiteCountDetails = (data: any[], startDate?: string, endDate?: string) => {
    if (!data || data.length === 0) return []

    // Generate target months from date range
    const targetMonths = new Set<string>()
    if (startDate && endDate) {
      const current = new Date(startDate)
      const end = new Date(endDate)
      // Include all months in the range
      while (current <= end) {
        targetMonths.add(formatDateToMonthYear(current.toISOString().split('T')[0]))
        current.setMonth(current.getMonth() + 1)
      }
    }

    const transformed = data.map(row => {
      // Sales Month: month of start_date
      const salesMonth = formatDateToMonthYear(row.start_date)

      // CS Month: month of (end_date + 1 day)
      let csMonth = ''
      if (row.end_date) {
        const endDate = new Date(row.end_date)
        // Add 1 day to get CS start date
        endDate.setDate(endDate.getDate() + 1)
        csMonth = formatDateToMonthYear(endDate.toISOString().split('T')[0])
      }

      return {
        team: row.team || '',
        pic: row.pic || '',
        pid: row.pid || '',
        pubname: row.pubname || '',
        start_date: row.start_date,
        end_date: row.end_date,
        sales_month: salesMonth,
        cs_month: csMonth,
      }
    })

    // FILTER: Only show sites where sales_month OR cs_month is in target months
    const filtered = targetMonths.size > 0
      ? transformed.filter(row => {
          return targetMonths.has(row.sales_month) || targetMonths.has(row.cs_month)
        })
      : transformed

    console.log('[transformSiteCountDetails] Filtered', filtered.length, 'rows from', transformed.length, 'total')
    if (targetMonths.size > 0) {
      console.log('[transformSiteCountDetails] Target months:', Array.from(targetMonths))
    }
    return filtered
  }

  const siteCountByTeamData = transformSiteCountByTeam(data?.salesCsSiteCountsByPic || [])
  const siteCountByPicData = transformSiteCountByPic(data?.salesCsSiteCountsByPic || [])

  // Memoize site count details with date range dependency
  const siteCountDetailsData = useMemo(() => {
    const result = transformSiteCountDetails(
      data?.salesCsSiteDetails || [],
      summaryDateRange.startDate,
      summaryDateRange.endDate
    )
    // Debug logging
    console.log('[siteCountDetailsData] Filter:', {
      startDate: summaryDateRange.startDate,
      endDate: summaryDateRange.endDate,
      inputCount: data?.salesCsSiteDetails?.length || 0,
      outputCount: result.length,
      sampleOutput: result.slice(0, 3).map(r => ({ pid: r.pid, sales_month: r.sales_month, cs_month: r.cs_month }))
    })
    return result
  }, [data?.salesCsSiteDetails, summaryDateRange.startDate, summaryDateRange.endDate])

  // Aggregate counts from filtered Details table (source of truth)
  // Generate target months from date range for counting logic
  const siteCountByTeamDataFromDetails = useMemo(() => {
    // Generate target months from date range for counting logic
    const targetMonths = new Set<string>()
    if (summaryDateRange.startDate && summaryDateRange.endDate) {
      const current = new Date(summaryDateRange.startDate)
      const end = new Date(summaryDateRange.endDate)
      while (current <= end) {
        targetMonths.add(formatDateToMonthYear(current.toISOString().split('T')[0]))
        current.setMonth(current.getMonth() + 1)
      }
    }

    // When no date range (all-time), include all sites (no month filtering)
    return transformSiteCountByTeam(siteCountDetailsData, targetMonths.size > 0 ? targetMonths : undefined)
  }, [siteCountDetailsData, summaryDateRange.startDate, summaryDateRange.endDate])

  const siteCountByPicDataFromDetails = useMemo(() => {
    // Generate target months from date range for counting logic
    const targetMonths = new Set<string>()
    if (summaryDateRange.startDate && summaryDateRange.endDate) {
      const current = new Date(summaryDateRange.startDate)
      const end = new Date(summaryDateRange.endDate)
      while (current <= end) {
        targetMonths.add(formatDateToMonthYear(current.toISOString().split('T')[0]))
        current.setMonth(current.getMonth() + 1)
      }
    }

    // When no date range (all-time), include all sites (no month filtering)
    return transformSiteCountByPic(siteCountDetailsData, targetMonths.size > 0 ? targetMonths : undefined)
  }, [siteCountDetailsData, summaryDateRange.startDate, summaryDateRange.endDate])

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
    { key: 'team', label: 'team' },
    { key: 'pic', label: 'pic' },
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

  // Columns for Sales-to-CS Site Count Tables

  // By Team columns (no total - sites can overlap)
  const siteCountByTeamColumns = [
    { key: 'team', label: 'Team' },
    { key: 'total_sales_sites', label: 'Sales Sites', format: (v: number) => v?.toLocaleString() || '-' },
    { key: 'total_cs_sites', label: 'CS Sites', format: (v: number) => v?.toLocaleString() || '-' },
  ]

  // By PIC columns (no total - sites can overlap)
  const siteCountByPicColumns = [
    { key: 'team', label: 'Team' },
    { key: 'pic', label: 'PIC' },
    { key: 'total_sales_sites', label: 'Sales Sites', format: (v: number) => v?.toLocaleString() || '-' },
    { key: 'total_cs_sites', label: 'CS Sites', format: (v: number) => v?.toLocaleString() || '-' },
  ]

  // Details columns - raw site data for verification
  const siteCountDetailsColumns = [
    { key: 'team', label: 'Team' },
    { key: 'pic', label: 'PIC' },
    { key: 'pid', label: 'PID' },
    { key: 'pubname', label: 'Pub Name' },
    { key: 'start_date', label: 'Start Date', format: (v: any) => formatDate(v?.value || v) },
    { key: 'end_date', label: 'End Date', format: (v: any) => formatDate(v?.value || v) },
    { key: 'sales_month', label: 'Sales Month' },
    { key: 'cs_month', label: 'CS Month' },
  ]

  // Helper to preserve cross-filter fields when updating filters
  const preserveCrossFilters = useCallback((filters: Record<string, any>, prevFilters: Record<string, any>) => {
    const preserved: Record<string, any> = {}
    prevCrossFilterFieldsRef.current.forEach(field => {
      if (prevFilters[field] !== undefined) {
        preserved[field] = prevFilters[field]
      }
    })
    return { ...filters, ...preserved }
  }, [])

  // Stable filter change handlers for each tab (no activeTab dependency)
  const handleSummaryFilterChange = useCallback((filters: Record<string, any>) => {
    setSummaryFilters(prev => preserveCrossFilters(filters, prev))
  }, [preserveCrossFilters])

  const handleDetailsFilterChange = useCallback((filters: Record<string, any>) => {
    setDetailsFilters(prev => preserveCrossFilters(filters, prev))
  }, [preserveCrossFilters])

  return (
    <AnalyticsPageLayout title="New Sales" showExport={true} contentRef={contentRef}>
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
            {/* Summary tab filter panel - team and pic filters */}
            <MetadataFilterPanel
              page="new-sales"
              filterFields={['team', 'pic']}
              onFilterChange={handleSummaryFilterChange}
              isLoading={loading}
            />

            <DatePresetButtons
              selectedPreset={summaryDatePreset}
              onPresetChange={handleSummaryPresetChange}
            />

            {/* Custom date range inputs - show only when custom preset is selected */}
            {summaryDatePreset === 'custom' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="summary-start-date" className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    id="summary-start-date"
                    type="date"
                    value={summaryDateRange.startDate || ''}
                    onChange={(e) => setSummaryDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="summary-end-date" className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    id="summary-end-date"
                    type="date"
                    value={summaryDateRange.endDate || ''}
                    onChange={(e) => setSummaryDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

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

                  {/* Sales to CS Site Count - By Team */}
                  <DataTable
                    title="Sales to CS Site Count - By Team"
                    columns={siteCountByTeamColumns}
                    data={siteCountByTeamDataFromDetails}
                    pageSize={10}
                    enableCrossFilter={false}
                  />

                  {/* Sales to CS Site Count - By PIC */}
                  <DataTable
                    title="Sales to CS Site Count - By PIC"
                    columns={siteCountByPicColumns}
                    data={siteCountByPicDataFromDetails}
                    pageSize={100}
                    enableCrossFilter={true}
                    crossFilterColumns={['pic']}
                  />

                  {/* Sales to CS Site Count - Details (raw site data) */}
                  <DataTable
                    title="Sales to CS Site Count - Details (Raw Sites)"
                    columns={siteCountDetailsColumns}
                    data={siteCountDetailsData}
                    pageSize={100}
                    enableCrossFilter={true}
                    crossFilterColumns={['pic', 'pid', 'pubname']}
                  />
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Tab 2: Details */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Details tab filter panel - includes daterange, team, pic, month, year */}
            <MetadataFilterPanel
              page="new-sales"
              filterFields={['daterange', 'team', 'pic', 'month', 'year']}
              onFilterChange={handleDetailsFilterChange}
              isLoading={loading}
            />

            <DatePresetButtons
              selectedPreset={detailsPreset}
              onPresetChange={handleDetailsPresetChange}
            />

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
