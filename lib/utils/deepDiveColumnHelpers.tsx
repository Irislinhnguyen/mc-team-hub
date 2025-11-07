/**
 * Deep Dive Column Helpers
 *
 * Reusable column renderers for deep dive tables
 */

import React from 'react'
import type { ColumnConfig } from '../../app/components/performance-tracker/TierSection'
import { colors } from '../colors'
import { HealthActionsHelpPopover } from '../../app/components/performance-tracker/HealthActionsHelpPopover'

export const formatRevenue = (val: number | null | undefined) => {
  if (val == null) return '$0'
  return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export const formatPct = (val: number | null | undefined) => {
  if (val == null) return '0.0%'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}%`
}

export const formatPctPlain = (val: number | null | undefined) => {
  if (val == null) return '0.0%'
  return `${val.toFixed(1)}%`
}

export const getChangeColor = (val: number | null | undefined) => {
  if (val == null) return colors.text.secondary
  if (val > 0) return colors.status.success
  if (val < 0) return colors.status.danger
  return colors.text.secondary
}

/**
 * Revenue column with % of total
 */
export const revenueColumn = (tier: 'A' | 'B' | 'C' | 'NEW' | 'LOST'): ColumnConfig => ({
  key: 'revenue',
  label: tier === 'LOST' ? 'Revenue P1' : 'Revenue P2',
  width: '15%',
  render: (item) => {
    const rev2 = item.rev_p2 || 0
    const totalRevenue = item.total_revenue || 0
    const revenuePct = totalRevenue > 0 ? (rev2 / totalRevenue) * 100 : 0
    const cumulativePct = item.cumulative_revenue_pct || 0

    return (
      <div>
        <div style={{ color: colors.text.primary }}>{formatRevenue(rev2)}</div>
        <div className="text-xs" style={{ color: colors.text.secondary }}>
          {formatPctPlain(revenuePct)} of total
        </div>
        <div className="text-xs" style={{ color: colors.interactive.primary }}>
          {formatPctPlain(cumulativePct)} cumul.
        </div>
      </div>
    )
  }
})

/**
 * Change column (P2, P1, %)
 */
export const changeColumn = (): ColumnConfig => ({
  key: 'change',
  label: 'Change',
  width: '12%',
  render: (item) => {
    const rev1 = item.rev_p1 || 0
    const rev2 = item.rev_p2 || 0
    const pctChange = item.rev_change_pct || 0

    return (
      <div>
        <div style={{ color: colors.text.primary }}>
          {formatRevenue(rev2)}
        </div>
        <div className="text-xs" style={{ color: colors.text.secondary }}>
          {formatRevenue(rev1)}
        </div>
        <div className="text-xs" style={{ color: getChangeColor(pctChange) }}>
          {formatPct(pctChange)}
        </div>
      </div>
    )
  }
})

/**
 * Requests column (P2, P1, %)
 */
export const requestsColumn = (): ColumnConfig => ({
  key: 'requests',
  label: 'Requests',
  width: '12%',
  render: (item) => {
    const req1 = item.req_p1 || 0
    const req2 = item.req_p2 || 0
    const reqChange = item.req_change_pct || 0

    return (
      <div>
        <div style={{ color: colors.text.primary }}>{req2.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <div className="text-xs" style={{ color: colors.text.secondary }}>
          {req1.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="text-xs" style={{ color: getChangeColor(reqChange) }}>
          {formatPct(reqChange)}
        </div>
      </div>
    )
  }
})

/**
 * eCPM column (P2, P1, %)
 */
export const ecpmColumn = (): ColumnConfig => ({
  key: 'ecpm',
  label: 'eCPM',
  width: '10%',
  render: (item) => {
    const req1 = item.req_p1 || 0
    const req2 = item.req_p2 || 0
    const rev1 = item.rev_p1 || 0
    const rev2 = item.rev_p2 || 0

    const ecpm1 = req1 > 0 ? (rev1 / req1) * 1000 : 0
    const ecpm2 = req2 > 0 ? (rev2 / req2) * 1000 : 0
    const ecpmChange = ecpm1 > 0 ? ((ecpm2 - ecpm1) / ecpm1) * 100 : 0

    return (
      <div>
        <div style={{ color: colors.text.primary }}>${ecpm2.toFixed(2)}</div>
        <div className="text-xs" style={{ color: colors.text.secondary }}>
          ${ecpm1.toFixed(2)}
        </div>
        <div className="text-xs" style={{ color: getChangeColor(ecpmChange) }}>
          {formatPct(ecpmChange)}
        </div>
      </div>
    )
  }
})

/**
 * Actionable Warnings column
 * Shows intelligent warnings based on metric analysis
 */
export const warningsColumn = (): ColumnConfig => ({
  key: 'warnings',
  label: (
    <span className="inline-flex items-center">
      Health & Actions
      <HealthActionsHelpPopover />
    </span>
  ),
  width: '30%',
  render: (item) => {
    // If no warning message, it's healthy - show nothing
    if (!item.warning_message || item.warning_severity === 'healthy') {
      return null
    }

    const severityColors = {
      'info': colors.status.info,
      'warning': colors.status.warning,
      'critical': colors.status.danger
    }

    const color = severityColors[item.warning_severity as keyof typeof severityColors] || colors.text.secondary

    return (
      <div className="text-xs" style={{ color, lineHeight: '1.3' }}>
        {item.warning_message}
      </div>
    )
  }
})

/**
 * Group column for NEW/LOST items
 */
export const groupColumn = (): ColumnConfig => ({
  key: 'group',
  label: 'Group',
  width: '10%',
  render: (item) => {
    const tierColors = {
      'new_A': { bg: colors.status.successBg, text: colors.status.success },
      'new_B': { bg: colors.status.warningBg, text: colors.status.warning },
      'new_C': { bg: colors.status.dangerBg, text: colors.status.danger },
      'lost_A': { bg: colors.status.dangerBg, text: colors.status.danger },
      'lost_B': { bg: colors.status.dangerBg, text: colors.status.danger },
      'lost_C': { bg: colors.status.dangerBg, text: colors.status.danger }
    }

    const group = item.tier_group
    const tierColor = tierColors[group as keyof typeof tierColors] || { bg: colors.surface.muted, text: colors.text.secondary }

    return (
      <span
        className="px-2 py-1 rounded-full text-xs"
        style={{ backgroundColor: tierColor.bg, color: tierColor.text }}
      >
        {group}
      </span>
    )
  }
})

/**
 * Lost impact column
 */
export const lostImpactColumn = (): ColumnConfig => ({
  key: 'impact',
  label: 'Lost Impact',
  width: '15%',
  render: (item) => {
    return (
      <div style={{ color: colors.status.danger }}>
        -{formatRevenue(item.lost_revenue || 0)}/mo
      </div>
    )
  }
})

/**
 * Notes column for NEW items
 */
export const notesColumn = (): ColumnConfig => ({
  key: 'notes',
  label: 'Notes',
  width: '20%',
  render: (item) => {
    const group = item.tier_group

    let note = ''
    if (group === 'NEW-A') {
      note = 'Strong start - In top 80% if ranked'
    } else if (group === 'NEW-B') {
      note = 'Moderate start - In 80-95% range'
    } else if (group === 'NEW-C') {
      note = 'Weak start - Bottom tier'
    }

    return <span className="text-sm text-gray-600">{note}</span>
  }
})

