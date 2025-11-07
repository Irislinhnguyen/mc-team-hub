'use client'

/**
 * TierSection Component
 *
 * Displays a section for a specific tier (A, B, C, NEW, or LOST)
 * with revenue-sorted items and transition warnings
 */

import React from 'react'
import { colors } from '../../../lib/colors'
import { Download } from 'lucide-react'
import { exportTierToCSV } from '../../../lib/utils/deepDiveExport'

export interface TierSectionProps {
  tier: 'A' | 'B' | 'C' | 'NEW' | 'LOST'
  title: string
  description: string
  items: any[]
  perspective: string
  onDrillDown?: (item: any) => void
  columns: ColumnConfig[]
}

export interface ColumnConfig {
  key: string
  label: string | React.ReactNode
  render: (item: any) => React.ReactNode
  width?: string
}

const getTierColor = (tier: 'A' | 'B' | 'C' | 'NEW' | 'LOST') => {
  switch (tier) {
    case 'A':
      return colors.status.success // Green
    case 'B':
      return colors.status.warning // Orange
    case 'C':
      return colors.status.danger // Red
    case 'NEW':
      return colors.status.info // Blue
    case 'LOST':
      return colors.status.danger // Red
  }
}

const TIER_LABELS = {
  A: 'TIER A',
  B: 'TIER B',
  C: 'TIER C',
  NEW: 'NEW',
  LOST: 'LOST'
}

export default function TierSection({
  tier,
  title,
  description,
  items,
  perspective,
  onDrillDown,
  columns
}: TierSectionProps) {
  if (items.length === 0) {
    const message = tier === 'NEW'
      ? 'No new items in this period'
      : tier === 'LOST'
      ? 'No lost items in this period'
      : `No items in Tier ${tier}`

    return (
      <div className="text-center py-12" style={{ color: '#6b7280' }}>
        {message}
      </div>
    )
  }

  // Sort by revenue DESC (highest impact first)
  const sortedItems = [...items].sort((a, b) => {
    const revA = tier === 'LOST' ? (a.rev_p1 || 0) : (a.rev_p2 || 0)
    const revB = tier === 'LOST' ? (b.rev_p1 || 0) : (b.rev_p2 || 0)
    return revB - revA
  })

  const totalRevenue = sortedItems.reduce((sum, item) => {
    return sum + (tier === 'LOST' ? (item.rev_p1 || 0) : (item.rev_p2 || 0))
  }, 0)

  const tierColor = getTierColor(tier)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: tierColor }}>{title}</span>
            <span className="text-sm font-normal" style={{ color: colors.text.secondary }}>
              ({items.length} items = ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </span>
          </h3>
          <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>{description}</p>
        </div>
        <button
          onClick={() => exportTierToCSV(sortedItems, tier, perspective)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
          style={{
            borderColor: colors.border.default,
            color: colors.interactive.primary,
            backgroundColor: colors.surface.card
          }}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide bg-slate-50"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                {onDrillDown && (
                  <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide bg-slate-50 w-24">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedItems.map((item, index) => (
                <tr
                  key={index}
                  className="transition-colors hover:bg-slate-50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-2 py-2 text-sm tabular-nums"
                      style={{ width: col.width }}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                  {onDrillDown && (
                    <td className="px-2 py-2 text-sm w-24">
                      <button
                        onClick={() => onDrillDown(item)}
                        style={{ color: colors.interactive.primary }}
                      >
                        View Details
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
