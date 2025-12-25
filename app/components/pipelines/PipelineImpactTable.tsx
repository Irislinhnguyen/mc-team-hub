'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'
import { TrendingUp, TrendingDown } from 'lucide-react'
import PipelineImpactTableSkeleton from './skeletons/PipelineImpactTableSkeleton'

interface PipelineImpact {
  id: string
  publisher: string
  poc: string
  status: string
  slot_type: 'new' | 'existing'
  actual_starting_date: string
  projected_30d: number
  actual_30d: number
  variance: number
  variance_percent: number
  affected_zones: string[]
  affected_zones_count: number
  pid: string | null
  mid: string | null
  granularity: 'pid' | 'pid_mid' | 'pid_mid_zid'
  calculated_days: number
  is_locked?: boolean
}

interface PipelineImpactTableProps {
  filterStatuses?: string[]
  filterPICs?: string[]
  filterProducts?: string[]
  filterSlotTypes?: string[]
  filterTeams?: string[]
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
  onPipelineClick
}: PipelineImpactTableProps) {
  const [impacts, setImpacts] = useState<PipelineImpact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchImpacts() {
      try {
        setLoading(true)
        setError(null)

        console.log('[PipelineImpactTable] Fetching pipeline impacts with filters:', {
          statuses: filterStatuses,
          pics: filterPICs,
          products: filterProducts,
          slotTypes: filterSlotTypes,
          teams: filterTeams
        })

        // Default to 【S】 if no status filter provided
        const statuses = filterStatuses.length > 0 ? filterStatuses : ['【S】']

        const res = await fetch('/api/pipelines/impact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: statuses,
            pocs: filterPICs,
            products: filterProducts,
            slotTypes: filterSlotTypes,
            teams: filterTeams
          })
        })

        if (!res.ok) {
          throw new Error(`Failed to fetch impacts: ${res.statusText}`)
        }

        const data = await res.json()

        if (data.status === 'ok') {
          setImpacts(data.data.impacts)
        } else {
          throw new Error(data.message || 'Unknown error')
        }
      } catch (err) {
        console.error('[PipelineImpactTable] Error fetching impacts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load impact data')
      } finally {
        setLoading(false)
      }
    }

    fetchImpacts()
  }, [filterStatuses, filterPICs, filterProducts, filterSlotTypes, filterTeams])

  // Show loading skeleton
  if (loading) {
    return <PipelineImpactTableSkeleton />
  }

  // Show error state (optional - could also auto-hide on error)
  if (error) {
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
          <p style={{ color: colors.status.danger, fontSize: typography.sizes.dataPoint }}>
            {error}
          </p>
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
                      color: impact.actual_30d > 0 ? colors.text.primary : colors.text.tertiary
                    }}
                  >
                    {impact.actual_30d > 0 ? formatCurrency(impact.actual_30d) : 'N/A'}
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
