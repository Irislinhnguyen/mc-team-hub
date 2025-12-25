'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Pipeline } from '@/lib/types/pipeline'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'
import { formatDateShort } from '@/lib/utils/dateHelpers'

interface MissingPidMidTableProps {
  pipelines: Pipeline[]
  onPipelineClick?: (pipeline: Pipeline) => void
}

interface EnrichedPipeline extends Pipeline {
  days_since_s: number
  missing_fields: 'PID' | 'MID' | 'Both'
}

export function MissingPidMidTable({ pipelines, onPipelineClick }: MissingPidMidTableProps) {
  // Filter and enrich pipelines
  const missingPidMidPipelines = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return pipelines
      .filter(p => {
        // Must be in S- or S status
        if (p.status !== '【S-】' && p.status !== '【S】') return false

        // Must be missing PID or MID (or both)
        if (p.pid && p.mid) return false

        return true
      })
      .map(p => {
        // Calculate days since S-
        const daysSinceS = p.actual_starting_date
          ? Math.floor((today.getTime() - new Date(p.actual_starting_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        // Determine missing fields
        const missing_fields: 'PID' | 'MID' | 'Both' = !p.pid && !p.mid ? 'Both' : !p.pid ? 'PID' : 'MID'

        return {
          ...p,
          days_since_s: daysSinceS,
          missing_fields
        }
      })
      .sort((a, b) => b.days_since_s - a.days_since_s) // Most urgent first
  }, [pipelines])

  // Don't render if no pipelines missing data
  if (missingPidMidPipelines.length === 0) {
    return null
  }

  // Helper: Get days color based on urgency
  const getDaysColor = (days: number): string => {
    if (days === 0) return colors.text.tertiary  // Gray
    if (days <= 30) return colors.status.info     // Blue
    if (days <= 60) return colors.status.warning  // Orange
    return colors.status.danger                    // Red
  }

  // Helper: Get status badge
  const getStatusBadge = (status: string) => {
    return status === '【S】'
      ? <Badge variant="success-subtle" className="text-[10px]">S</Badge>
      : <Badge variant="info-subtle" className="text-[10px]">S-</Badge>
  }

  // Helper: Get missing fields badge
  const getMissingBadge = (missing: 'PID' | 'MID' | 'Both') => {
    const variant = missing === 'Both' ? 'danger-subtle' : 'warning-subtle'
    return <Badge variant={variant} className="text-[10px]">{missing}</Badge>
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
          Missing PID/MID ({missingPidMidPipelines.length})
        </h3>

        <div className="overflow-y-auto" style={{ height: '400px' }}>
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
                  <span className="whitespace-nowrap">Started On</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'right'
                  }}
                >
                  <span className="whitespace-nowrap">Days Since S-</span>
                </th>
                <th
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: 'center'
                  }}
                >
                  <span className="whitespace-nowrap">Missing</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {missingPidMidPipelines.map((pipeline, idx) => (
                <tr
                  key={pipeline.id}
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
                  onClick={() => onPipelineClick?.(pipeline)}
                >
                  {/* Publisher */}
                  <td
                    className="px-2 py-2 leading-tight font-medium"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.primary
                    }}
                  >
                    {pipeline.publisher || 'Unnamed'}
                  </td>
                  {/* POC */}
                  <td
                    className="px-2 py-2 leading-tight"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.primary
                    }}
                  >
                    {pipeline.poc || '-'}
                  </td>
                  {/* Status */}
                  <td className="px-2 py-2 leading-tight text-center">
                    {getStatusBadge(pipeline.status)}
                  </td>
                  {/* Started On */}
                  <td
                    className="px-2 py-2 leading-tight"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.primary
                    }}
                  >
                    {pipeline.actual_starting_date ? formatDateShort(pipeline.actual_starting_date) : 'N/A'}
                  </td>
                  {/* Days Since S- */}
                  <td
                    className="px-2 py-2 leading-tight text-right"
                    style={{
                      fontSize: typography.sizes.dataPoint
                    }}
                  >
                    <span className="font-bold" style={{
                      color: getDaysColor(pipeline.days_since_s)
                    }}>
                      {pipeline.days_since_s}d
                    </span>
                  </td>
                  {/* Missing */}
                  <td className="px-2 py-2 leading-tight text-center">
                    {getMissingBadge(pipeline.missing_fields)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
