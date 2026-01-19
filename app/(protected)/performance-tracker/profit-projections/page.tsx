'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { DataTable } from '../../../components/performance-tracker/DataTable'
import { DataTableSkeleton } from '../../../components/performance-tracker/skeletons/DataTableSkeleton'
import { ToggleGroup, ToggleGroupItem } from '../../../../src/components/ui/toggle-group'
import { useCrossFilter } from '../../../contexts/CrossFilterContext'
import { colors } from '../../../../lib/colors'
import { formatMetricValue } from '../../../../lib/utils/formatters'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useProfitProjections } from '../../../../lib/hooks/queries/useProfitProjections'
import { useClientSideFilterMulti } from '../../../../lib/hooks/useClientSideFilter'

/**
 * REFACTORED VERSION - Profit Projections Page
 *
 * Changes from original:
 * - Uses AnalyticsPageLayout for consistent structure
 * - Uses MetadataFilterPanel (eliminates ~80 lines of metadata handling)
 * - Uses React Query for caching (useProfitProjections hook)
 * - Added export functionality (contentRef)
 * - Proper loading skeletons
 * - Filter persistence via localStorage
 * - Cleaner, more maintainable code
 *
 * Cross-filter logic: KEPT AS-IS (not refactored per plan)
 */

interface ProjectionsData {
  pidPredictions: any[]
  midPredictions: any[]
  zidPredictions: any[]
  pidGrandTotal: any
  midGrandTotal: any
  zidGrandTotal: any
}

export default function ProfitProjectionsPage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({})
  const [metricType, setMetricType] = useState<'profit' | 'revenue'>('profit')
  const { crossFilters } = useCrossFilter()

  // Stabilize setCurrentFilters to prevent infinite loops
  const stableSetCurrentFilters = useCallback((filters: Record<string, any>) => {
    setCurrentFilters(filters)
  }, [])

  // Use React Query hook for data fetching and caching
  const { data: rawData, isLoading: loading, error } = useProfitProjections(currentFilters)
  const dataError = error ? error.message : null

  // Apply client-side filtering for cross-filters (instant, no API call)
  const { filteredData: filteredPidPredictions } = useClientSideFilterMulti(
    rawData?.pidPredictions,
    crossFilters
  )
  const { filteredData: filteredMidPredictions } = useClientSideFilterMulti(
    rawData?.midPredictions,
    crossFilters
  )
  const { filteredData: filteredZidPredictions } = useClientSideFilterMulti(
    rawData?.zidPredictions,
    crossFilters
  )

  // Combine filtered data
  const data = useMemo(() => {
    if (!rawData) return undefined
    return {
      pidPredictions: filteredPidPredictions,
      midPredictions: filteredMidPredictions,
      zidPredictions: filteredZidPredictions,
      pidGrandTotal: rawData.pidGrandTotal,
      midGrandTotal: rawData.midGrandTotal,
      zidGrandTotal: rawData.zidGrandTotal,
    }
  }, [filteredPidPredictions, filteredMidPredictions, filteredZidPredictions, rawData])

  // Column configurations
  const formatWowProfit = (value: any) => {
    const num = parseFloat(value)
    if (isNaN(num)) return '0.00'
    const formatted = formatMetricValue(num, 'revenue')
    return num >= 0 ? `+${formatted}` : formatted
  }

  // Dynamic column generator based on metric type
  const generateColumns = (
    type: 'pid' | 'mid' | 'zid',
    metricType: 'profit' | 'revenue'
  ) => {
    const suffix = metricType === 'profit' ? 'profit' : 'rev'

    // Base columns for each type
    const baseColumns: Record<string, any[]> = {
      pid: [
        { key: 'pic', label: 'PIC', width: '100px' },
        { key: 'pid', label: 'PID', width: '80px' },
        { key: 'pubname', label: 'Publisher Name', width: '200px' },
      ],
      mid: [
        { key: 'pid', label: 'PID', width: '80px' },
        { key: 'mid', label: 'MID', width: '80px' },
        { key: 'medianame', label: 'Media Name', width: '200px' },
      ],
      zid: [
        { key: 'pid', label: 'PID', width: '80px' },
        { key: 'mid', label: 'MID', width: '80px' },
        { key: 'zid', label: 'ZID', width: '80px' },
        { key: 'zonename', label: 'Zone Name', width: '200px' },
      ],
    }

    // Metric columns
    const metricColumns = [
      { key: `last_month_${suffix}`, label: 'Last Month', width: '120px' },
      { key: `w1_${suffix}`, label: 'Week 1', width: '120px' },
      { key: `w2_${suffix}`, label: 'Week 2', width: '120px' },
      { key: `w3_${suffix}`, label: 'Week 3', width: '120px' },
      { key: `w4_${suffix}`, label: 'Week 4', width: '120px' },
      { key: `w5_${suffix}`, label: 'Week 5', width: '120px' },
      { key: `mom_${suffix}`, label: 'MoM Change', width: '120px', format: formatWowProfit },
      { key: `wow_${suffix}`, label: 'WoW Change', width: '120px', format: formatWowProfit },
    ]

    return [...baseColumns[type], ...metricColumns]
  }

  // Generate columns based on current metric type
  const pidColumns = useMemo(() => generateColumns('pid', metricType), [metricType])
  const midColumns = useMemo(() => generateColumns('mid', metricType), [metricType])
  const zidColumns = useMemo(() => generateColumns('zid', metricType), [metricType])

  // Add grand total row to data
  const addGrandTotal = (tableData: any[], grandTotal: any, identifierFields: string[]) => {
    if (!tableData || !grandTotal) return []

    const totalRow = {
      ...grandTotal,
      isGrandTotal: true,
    }

    // Set identifier fields to show "Grand Total"
    identifierFields.forEach((field, index) => {
      totalRow[field] = index === 0 ? 'Grand Total' : ''
    })

    return [...tableData, totalRow]
  }

  const pidDataWithTotal = data ? addGrandTotal(data.pidPredictions, data.pidGrandTotal, ['pic', 'pid', 'pubname']) : []
  const midDataWithTotal = data ? addGrandTotal(data.midPredictions, data.midGrandTotal, ['pid', 'mid', 'medianame']) : []
  const zidDataWithTotal = data ? addGrandTotal(data.zidPredictions, data.zidGrandTotal, ['mid', 'zid', 'zonename']) : []

  return (
    <AnalyticsPageLayout title="Profit Projection" showExport={true} contentRef={contentRef}>
      {/* Filter Panel with integrated metadata handling */}
      <MetadataFilterPanel
        page="profit-projections"
        filterFields={['team', 'pic', 'product', 'pid', 'mid', 'pubname', 'medianame', 'zid', 'zonename']}
        onFilterChange={stableSetCurrentFilters}
        isLoading={loading}
        enableCascading={true}
      />

      {/* Metric Selector */}
        <div className="flex items-center gap-4 px-4">
          <span className="text-sm font-medium text-gray-700">Select Metric:</span>
          <ToggleGroup
            type="single"
            value={metricType}
            onValueChange={(value) => {
              if (value) setMetricType(value as 'profit' | 'revenue')
            }}
          >
            <ToggleGroupItem value="revenue">Revenue</ToggleGroupItem>
            <ToggleGroupItem value="profit">Profit</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {dataError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-900 mb-2">Failed to Load Data</h3>
            <p className="text-red-700 text-sm">{dataError}</p>
          </div>
        ) : loading ? (
          <>
            <DataTableSkeleton columns={pidColumns} rows={10} showGrandTotal={true} />
            <DataTableSkeleton columns={midColumns} rows={10} showGrandTotal={true} />
            <DataTableSkeleton columns={zidColumns} rows={10} showGrandTotal={true} />
          </>
        ) : data ? (
          <>
            {/* PID Projections Table */}
            <DataTable
              title={`Publisher (PID) ${metricType === 'profit' ? 'Profit' : 'Revenue'} Projections`}
              columns={pidColumns}
              data={pidDataWithTotal}
              pageSize={100}
              enableCrossFilter={true}
              crossFilterColumns={['pic', 'pid', 'pubname']}
            />

            {/* MID Projections Table */}
            <DataTable
              title={`Media (MID) ${metricType === 'profit' ? 'Profit' : 'Revenue'} Projections`}
              columns={midColumns}
              data={midDataWithTotal}
              pageSize={100}
              enableCrossFilter={true}
              crossFilterColumns={['pic', 'pid', 'mid', 'medianame']}
            />

            {/* ZID Projections Table */}
            <DataTable
              title={`Zone (ZID) ${metricType === 'profit' ? 'Profit' : 'Revenue'} Projections`}
              columns={zidColumns}
              data={zidDataWithTotal}
              pageSize={100}
              enableCrossFilter={true}
              crossFilterColumns={['pic', 'pid', 'mid', 'zid', 'zonename']}
            />
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">No data available. Please select filters above.</p>
          </div>
        )}
    </AnalyticsPageLayout>
  )
}
