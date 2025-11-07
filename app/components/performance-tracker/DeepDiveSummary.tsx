'use client'

/**
 * DeepDiveSummary Component
 *
 * Displays summary metrics for deep dive analysis
 */

import React from 'react'
import { colors } from '../../../lib/colors'

export interface DeepDiveSummaryProps {
  summary: {
    total_items: number
    total_revenue_p1: number
    total_revenue_p2: number
    revenue_change_pct: number
    total_requests_p1: number
    total_requests_p2: number
    requests_change_pct: number
    total_ecpm_p1: number
    total_ecpm_p2: number
    ecpm_change_pct: number
    tier_counts: Record<string, number>
    tier_revenue: Record<string, number>
  }
  perspective: string
  periodLabels: {
    period1: string
    period2: string
  }
  filters?: Record<string, any>
}

export default function DeepDiveSummary({
  summary,
  perspective,
  periodLabels,
  filters = {}
}: DeepDiveSummaryProps) {
  const {
    total_items,
    total_revenue_p1,
    total_revenue_p2,
    revenue_change_pct,
    total_requests_p1,
    total_requests_p2,
    requests_change_pct,
    total_ecpm_p1,
    total_ecpm_p2,
    ecpm_change_pct,
    tier_counts,
    tier_revenue
  } = summary

  // Build title based on perspective and filters
  const getPerspectiveLabel = () => {
    const labels: Record<string, string> = {
      team: 'Team Analysis',
      pic: 'PIC Analysis',
      pid: 'Publisher Analysis',
      mid: 'Media Property Analysis',
      product: 'Product Analysis',
      zone: 'Zone Analysis'
    }
    return labels[perspective] || perspective
  }

  const getFilterDescription = () => {
    const activeFilters: string[] = []

    if (filters.product && Array.isArray(filters.product) && filters.product.length > 0) {
      activeFilters.push(`Product: ${filters.product.join(', ')}`)
    }
    if (filters.team && Array.isArray(filters.team) && filters.team.length > 0) {
      activeFilters.push(`Team: ${filters.team.join(', ')}`)
    }
    if (filters.pic && Array.isArray(filters.pic) && filters.pic.length > 0) {
      activeFilters.push(`PIC: ${filters.pic.join(', ')}`)
    }
    if (filters.pid && Array.isArray(filters.pid) && filters.pid.length > 0) {
      activeFilters.push(`PID: ${filters.pid.join(', ')}`)
    }
    if (filters.mid && Array.isArray(filters.mid) && filters.mid.length > 0) {
      activeFilters.push(`MID: ${filters.mid.join(', ')}`)
    }
    if (filters.zid && Array.isArray(filters.zid) && filters.zid.length > 0) {
      activeFilters.push(`Zone: ${filters.zid.join(', ')}`)
    }

    return activeFilters.length > 0 ? ` - ${activeFilters.join(' • ')}` : ''
  }

  const title = `${getPerspectiveLabel()}${getFilterDescription()}`

  const formatRevenue = (val: number) => {
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }

  const formatRequests = (val: number) => {
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const formatECPM = (val: number) => {
    return `$${val.toFixed(2)}`
  }

  const formatPct = (val: number) => {
    const sign = val >= 0 ? '+' : ''
    return `${sign}${val.toFixed(1)}%`
  }

  const getChangeColor = (val: number) => {
    if (val > 0) return '#2E7D32' // Green
    if (val < 0) return '#C62828' // Red
    return colors.text.secondary
  }

  // Consistent color scheme
  const mainValueColor = '#1565C0' // Blue for all P2 values
  const comparisonColor = '#78909C' // Gray for all P1 values

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-semibold text-center mb-6" style={{ color: '#1976D2' }}>
        {title}
      </h2>

      {/* Row 1: Revenue + Requests (2 large cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Total Revenue */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Total Revenue
          </div>
          <div className="text-2xl font-semibold tabular-nums mb-3" style={{ color: mainValueColor, lineHeight: 1.2 }}>
            {formatRevenue(total_revenue_p2)}
          </div>
          <div className="text-xs flex items-center gap-2">
            <span style={{ color: comparisonColor }}>
              P1: {formatRevenue(total_revenue_p1)}
            </span>
            <span className="text-gray-400">|</span>
            <span className="font-semibold" style={{ color: getChangeColor(revenue_change_pct) }}>
              {formatPct(revenue_change_pct)}
            </span>
          </div>
        </div>

        {/* Total Requests */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Total Requests
          </div>
          <div className="text-2xl font-semibold tabular-nums mb-3" style={{ color: mainValueColor, lineHeight: 1.2 }}>
            {formatRequests(total_requests_p2)}
          </div>
          <div className="text-xs flex items-center gap-2">
            <span style={{ color: comparisonColor }}>
              P1: {formatRequests(total_requests_p1)}
            </span>
            <span className="text-gray-400">|</span>
            <span className="font-semibold" style={{ color: getChangeColor(requests_change_pct) }}>
              {formatPct(requests_change_pct)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: eCPM + Items Count + Tier Distribution (3 smaller cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* eCPM */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
            eCPM
          </div>
          <div className="text-lg font-semibold tabular-nums mb-2" style={{ color: mainValueColor, lineHeight: 1.2 }}>
            {formatECPM(total_ecpm_p2)}
          </div>
          <div className="text-[11px] flex items-center gap-1.5">
            <span style={{ color: comparisonColor }}>
              P1: {formatECPM(total_ecpm_p1)}
            </span>
            <span className="text-gray-400">|</span>
            <span className="font-semibold" style={{ color: getChangeColor(ecpm_change_pct) }}>
              {formatPct(ecpm_change_pct)}
            </span>
          </div>
        </div>

        {/* Items Count */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
            Items Count
          </div>
          <div className="text-lg font-semibold tabular-nums mb-2" style={{ color: mainValueColor, lineHeight: 1.2 }}>
            {total_items}
          </div>
          <div className="text-[11px] space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">A:</span>
              <span className="font-medium">{tier_counts.A}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">B:</span>
              <span className="font-medium">{tier_counts.B}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">C:</span>
              <span className="font-medium">{tier_counts.C}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: '#2E7D32' }}>New: {tier_counts.NEW || 0}</span>
              <span className="text-gray-400">|</span>
              <span style={{ color: '#C62828' }}>Lost: {tier_counts.LOST || 0}</span>
            </div>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Revenue by Tier
          </div>
          <div className="text-[11px] space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tier A:</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold" style={{ color: mainValueColor }}>
                  {formatRevenue(tier_revenue.A)}
                </span>
                <span className="text-gray-500 text-[10px]">
                  ({((tier_revenue.A / total_revenue_p2) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tier B:</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold" style={{ color: mainValueColor }}>
                  {formatRevenue(tier_revenue.B)}
                </span>
                <span className="text-gray-500 text-[10px]">
                  ({((tier_revenue.B / total_revenue_p2) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tier C:</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold" style={{ color: mainValueColor }}>
                  {formatRevenue(tier_revenue.C)}
                </span>
                <span className="text-gray-500 text-[10px]">
                  ({((tier_revenue.C / total_revenue_p2) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
