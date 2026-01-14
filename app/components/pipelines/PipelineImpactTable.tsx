'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import PipelineImpactTableSkeleton from './skeletons/PipelineImpactTableSkeleton'
import { usePipelineImpact, type PipelineImpact } from '@/lib/hooks/queries/usePipelineImpact'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface PipelineImpactTableProps {
  filterStatuses?: string[]
  filterPICs?: string[]
  filterProducts?: string[]
  filterSlotTypes?: string[]
  filterTeams?: string[]
  activeGroup: 'sales' | 'cs'
  filterYear?: number
  filterQuarter?: number
  onPipelineClick?: (pipelineId: string) => void
}

/**
 * Format currency value (USD)
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Get variance color based on performance
 * Green: >= +10% over-performed
 * Gray: 0% to +10% on target
 * Orange: 0% to -10% slight miss
 * Red: < -10% big miss
 */
function getVarianceColor(variancePercent: number): string {
  if (variancePercent >= 10) return colors.status.success // Green: #10B981
  if (variancePercent >= 0) return '#9CA3AF' // Gray: on target
  if (variancePercent >= -10) return colors.status.warning // Orange: slight miss
  return colors.status.danger // Red: big miss
}

/**
 * Get status badge
 */
function getStatusBadge(status: string) {
  return status === '【S】'
    ? <Badge variant="success-subtle" className="text-[10px]">S</Badge>
    : <Badge variant="info-subtle" className="text-[10px]">S-</Badge>
}

export function PipelineImpactTable({
  filterStatuses = [],
  filterPICs = [],
  filterProducts = [],
  filterSlotTypes = [],
  filterTeams = [],
  activeGroup,
  filterYear,
  filterQuarter,
  onPipelineClick
}: PipelineImpactTableProps) {
  // Stabilize filter object reference for React Query cache
  // Without useMemo, new object every render → cache miss → BigQuery runs every time
  // With useMemo, stable reference → cache hit → <50ms for reloads
  const filters = useMemo(() => ({
    status: filterStatuses.length > 0 ? filterStatuses : ['【S】'],
    pocs: filterPICs,
    products: filterProducts,
    slotTypes: filterSlotTypes,
    teams: filterTeams,
    group: activeGroup,
    fiscalYear: filterYear,
    fiscalQuarter: filterQuarter
  }), [filterStatuses, filterPICs, filterProducts, filterSlotTypes, filterTeams, activeGroup, filterYear, filterQuarter])

  // Debounce filter changes to prevent excessive BigQuery calls
  // User can change 5 filters rapidly → only 1 API call after 300ms
  const debouncedFilters = useDebounce(filters, 300)

  // Use React Query hook with caching (5 min stale, 10 min gc)
  // First call: 5-30s (BigQuery)
  // Cached calls: <50ms
  // 99% reduction in duplicate queries
  const { impacts: rawImpacts, loading, error: queryError } = usePipelineImpact(debouncedFilters)

  // Sort impacts by S- date (actual_starting_date) - newest first
  const impacts = useMemo(() => {
    if (!rawImpacts) return []
    return [...rawImpacts].sort((a, b) => {
      // Sort by actual_starting_date descending (newest first)
      if (!a.actual_starting_date && !b.actual_starting_date) return 0
      if (!a.actual_starting_date) return 1  // Move missing dates to bottom
      if (!b.actual_starting_date) return -1
      return new Date(b.actual_starting_date).getTime() - new Date(a.actual_starting_date).getTime()
    })
  }, [rawImpacts])

  // Convert query error to string for display
  const error = useMemo(() => {
    if (!queryError) return null
    return queryError instanceof Error ? queryError.message : 'Failed to load impact data'
  }, [queryError])

  // Show loading skeleton
  if (loading) {
    return <PipelineImpactTableSkeleton />
  }

  // Show error state with detailed information
  if (error) {
    // Try to parse error details from API response
    let errorData: { error?: string; details?: string; suggestion?: string; hint?: string } = {}
    try {
      // Check if error contains JSON response
      const jsonStart = error.indexOf('{')
      if (jsonStart !== -1) {
        const jsonStr = error.substring(jsonStart)
        errorData = JSON.parse(jsonStr)
      }
    } catch (e) {
      // Error is plain string
      errorData = { error: error }
    }

    return (
      <Card
        style={{
          backgroundColor: '#FFFFFF',
          border: `1px solid ${colors.neutralLight}`,
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 mb-1" style={{ fontSize: typography.sizes.sectionTitle }}>
                  Failed to Load Impact Data
                </h4>
                <p className="text-sm text-red-700 mb-2">
                  {errorData.error || error}
                </p>
                {errorData.details && (
                  <p className="text-xs text-red-600 mb-2">
                    <span className="font-medium">Details:</span> {errorData.details}
                  </p>
                )}
                {errorData.suggestion && (
                  <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                    <span className="font-medium">💡 Suggestion:</span> {errorData.suggestion}
                  </div>
                )}
                {errorData.hint && !errorData.suggestion && (
                  <p className="text-xs text-gray-600 mt-2">
                    <span className="font-medium">Hint:</span> {errorData.hint}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent className="p-4">
        <h3
          className="font-semibold mb-3"
          style={{
            fontSize: typography.sizes.sectionTitle,
            color: colors.main
          }}
        >
          Pipeline Impact Tracking ({impacts.length})
        </h3>

        {impacts.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: colors.text.secondary, fontSize: typography.sizes.dataPoint }}>
              No confirmed pipelines yet.
            </p>
            <p className="text-xs mt-2" style={{ color: colors.text.tertiary }}>
              Pipelines need: Status 【S】 + PID + actual_starting_date.
            </p>
            <p className="text-xs mt-1" style={{ color: colors.text.tertiary }}>
              "Days" shows data availability (e.g., 15/30 = 15 days out of 30).
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            <table className="w-full border-collapse">
            <thead
              className="sticky top-0 shadow-sm"
              style={{
                zIndex: 20,
                backgroundColor: colors.main
              }}
            >
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'left'
                  }}
                >
                  <span className="whitespace-nowrap">Publisher</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'left'
                  }}
                >
                  <span className="whitespace-nowrap">POC</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'center'
                  }}
                >
                  <span className="whitespace-nowrap">Status</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'left'
                  }}
                >
                  <span className="whitespace-nowrap">S- Date</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'center'
                  }}
                >
                  <span className="whitespace-nowrap">Days</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'center'
                  }}
                >
                  <span className="whitespace-nowrap">Slot Type</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'left'
                  }}
                >
                  <span className="whitespace-nowrap">PID</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'left'
                  }}
                >
                  <span className="whitespace-nowrap">MID</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'center'
                  }}
                >
                  <span className="whitespace-nowrap">ZID</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'right'
                  }}
                >
                  <span className="whitespace-nowrap">Projected 30d</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'right'
                  }}
                >
                  <span className="whitespace-nowrap">Actual 30d</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'right'
                  }}
                >
                  <span className="whitespace-nowrap">Variance</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {impacts.map((impact, idx) => (
                <tr
                  key={impact.id}
                  className="border-b border-slate-200 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                  onClick={() => onPipelineClick?.(impact.id)}
                >
                  {/* Publisher */}
                  <td
                    className="px-2 py-2 leading-tight font-medium"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.primary
                    }}
                  >
                    {impact.publisher || 'Unnamed'}
                  </td>
                  {/* POC */}
                  <td
                    className="px-2 py-2 leading-tight"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.primary
                    }}
                  >
                    {impact.poc || '-'}
                  </td>
                  {/* Status */}
                  <td className="px-2 py-2 leading-tight text-center">
                    {getStatusBadge(impact.status)}
                  </td>
                  {/* S- Date */}
                  <td
                    className="px-2 py-2 leading-tight"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: impact.actual_starting_date ? colors.text.primary : colors.status.danger
                    }}
                  >
                    {impact.actual_starting_date
                      ? new Date(impact.actual_starting_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Missing'}
                  </td>
                  {/* Days (Calculated/30) */}
                  <td
                    className="px-2 py-2 leading-tight text-center"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: impact.calculated_days === 30 ? colors.status.success :
                             impact.calculated_days > 0 ? colors.status.warning :
                             colors.text.tertiary
                    }}
                  >
                    {impact.calculated_days > 0 ? (
                      <span className="font-medium">
                        {impact.calculated_days}/30
                      </span>
                    ) : (
                      <span style={{ color: colors.text.tertiary }}>-</span>
                    )}
                  </td>
                  {/* Slot Type */}
                  <td className="px-2 py-2 leading-tight text-center">
                    <Badge
                      variant={impact.slot_type === 'new' ? 'success-subtle' : 'info-subtle'}
                      className="text-[10px]"
                    >
                      {impact.slot_type === 'new' ? 'New' : 'Existing'}
                    </Badge>
                  </td>
                  {/* PID */}
                  <td
                    className="px-2 py-2 leading-tight"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: impact.pid ? colors.text.primary : colors.status.danger
                    }}
                  >
                    {impact.pid || 'Missing'}
                  </td>
                  {/* MID */}
                  <td
                    className="px-2 py-2 leading-tight"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.primary
                    }}
                  >
                    {impact.mid || '-'}
                  </td>
                  {/* ZID (show count if available) */}
                  <td
                    className="px-2 py-2 leading-tight text-center"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.secondary
                    }}
                    title={impact.affected_zones_count > 0 ? `Zone IDs: ${impact.affected_zones.join(', ')}` : 'No specific zones'}
                  >
                    {impact.affected_zones_count > 0 ? `${impact.affected_zones_count}` : '-'}
                  </td>
                  {/* Projected 30d */}
                  <td
                    className="px-2 py-2 leading-tight text-right font-medium"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: impact.projected_30d > 0 ? colors.text.primary : colors.text.tertiary
                    }}
                  >
                    {impact.projected_30d > 0 ? formatCurrency(impact.projected_30d) : 'N/A'}
                  </td>
                  {/* Actual 30d */}
                  <td
                    className="px-2 py-2 leading-tight text-right font-medium"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: impact.actual_30d !== 0
                        ? (impact.actual_30d > 0 ? colors.text.primary : colors.status.danger)
                        : colors.text.tertiary
                    }}
                  >
                    {impact.actual_30d !== 0 ? formatCurrency(impact.actual_30d) : 'N/A'}
                  </td>
                  {/* Variance */}
                  <td className="px-2 py-2 leading-tight text-right">
                    <div className="flex items-center justify-end gap-1">
                      {impact.variance_percent >= 0 ? (
                        <TrendingUp className="h-3 w-3" style={{ color: getVarianceColor(impact.variance_percent) }} />
                      ) : (
                        <TrendingDown className="h-3 w-3" style={{ color: getVarianceColor(impact.variance_percent) }} />
                      )}
                      <span
                        className="font-bold"
                        style={{
                          fontSize: typography.sizes.dataPoint,
                          color: getVarianceColor(impact.variance_percent)
                        }}
                      >
                        {impact.variance_percent >= 0 ? '+' : ''}{impact.variance_percent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
