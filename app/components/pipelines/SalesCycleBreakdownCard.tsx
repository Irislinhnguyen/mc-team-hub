'use client'

/**
 * SalesCycleBreakdownCard Component
 *
 * Displays the average time spent in each stage transition of the sales cycle.
 * Shows visual flow from early stages (E/D) → consideration (C) → agreement (B) → closing (A) → distribution (S-) → won (S).
 *
 * For each transition, displays:
 * - Stage Transition: The from/to stages
 * - Average Days: Average days for the transition
 * - Sample Count: Number of samples
 */

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'
import type { PipelineGroup } from '@/lib/types/pipeline'

interface TransitionData {
  avg_days: number | null
  count: number
}

interface SalesCycleBreakdownCardProps {
  group: PipelineGroup
  transitions: Record<string, TransitionData>
  loading?: boolean
}

// Column definitions
const columns = [
  { key: 'transition', label: 'Stage Transition', align: 'left' as const },
  { key: 'avgDays', label: 'Average Days', align: 'right' as const },
  { key: 'count', label: 'Sample Count', align: 'right' as const },
]

// Transition entries in order
const TRANSITION_ENTRIES = [
  { key: '【E】/【D】 → 【C+】/【C】/【C-】', label: 'Early → Consideration' },
  { key: '【C+】/【C】/【C-】 → 【B】', label: 'Consideration → Agreement' },
  { key: '【B】 → 【A】', label: 'Agreement → Closing' },
  { key: '【A】 → 【S-】', label: 'Closing → Distribution' },
  { key: '【S-】 → 【S】', label: 'Distribution → Won' },
]

export function SalesCycleBreakdownCard({
  group,
  transitions,
  loading = false,
}: SalesCycleBreakdownCardProps) {
  // Title based on group
  const title = group === 'sales' ? 'Sales Cycle Breakdown' : 'CS Cycle Breakdown'
  const subtitle = group === 'sales'
    ? 'Average days between stage transitions for Sales pipelines'
    : 'Average days between stage transitions for CS pipelines'

  // Format average days value
  const formatAvgDays = (value: number | null): string => {
    if (value === null || value < 0) return '-'
    return `${value}d`
  }

  // Format sample count
  const formatCount = (count: number): string => {
    if (count > 0) return `n=${count}`
    return 'No data'
  }

  // Convert transitions to table data
  const tableData = TRANSITION_ENTRIES.map((entry) => {
    const data = transitions[entry.key]
    return {
      id: entry.key,
      transition: entry.key,
      avgDays: data?.avg_days ?? null,
      count: data?.count ?? 0,
    }
  })

  // Loading state
  if (loading) {
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
            className="font-semibold text-sm mb-3"
            style={{
              fontSize: typography.sizes.sectionTitle,
              color: colors.main,
            }}
          >
            {title}
          </h3>
          <p className="text-xs mb-3" style={{ color: colors.text.secondary }}>
            {subtitle}
          </p>
          <table className="w-full border-collapse">
            <thead
              className="sticky top-0"
              style={{
                backgroundColor: colors.main,
              }}
            >
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2"
                    style={{ textAlign: col.align }}
                  >
                    <Skeleton className="h-3 w-20 bg-white/30" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANSITION_ENTRIES.map((_, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-200"
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  }}
                >
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-40" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Skeleton className="h-3 w-12 ml-auto" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer note skeleton */}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: colors.neutralLight }}>
            <Skeleton className="h-3 w-full" />
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
          className="font-semibold text-sm mb-3"
          style={{
            fontSize: typography.sizes.sectionTitle,
            color: colors.main,
          }}
        >
          {title}
        </h3>
        <p className="text-xs mb-3" style={{ color: colors.text.secondary }}>
          {subtitle}
        </p>
        <table className="w-full border-collapse">
          <thead
            className="sticky top-0 shadow-sm"
            style={{
              zIndex: 20,
              backgroundColor: colors.main,
            }}
          >
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 font-semibold leading-tight"
                  style={{
                    fontSize: typography.sizes.filterHeader,
                    color: colors.text.inverse,
                    textAlign: col.align,
                  }}
                >
                  <span className="whitespace-nowrap">{col.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr
                key={row.id}
                className="border-b border-slate-200 transition-colors"
                style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-2 py-2 leading-tight"
                    style={{
                      fontSize: typography.sizes.dataPoint,
                      color: colors.text.primary,
                      textAlign: col.align,
                      fontWeight: col.key === 'avgDays' && row.avgDays !== null && row.avgDays >= 0 ? 'bold' : 'normal',
                    }}
                  >
                    {col.key === 'transition' && row.transition}
                    {col.key === 'avgDays' && formatAvgDays(row.avgDays)}
                    {col.key === 'count' && formatCount(row.count)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer note */}
      </CardContent>
    </Card>
  )
}
