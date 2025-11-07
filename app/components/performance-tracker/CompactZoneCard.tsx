'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { safeToFixed, safeNumber } from '../../../lib/utils/formatters'
import { colors } from '../../../lib/colors'

interface CompactZoneCardProps {
  zid: string
  zonename: string
  status?: 'new' | 'lost' | 'existing'
  risk_level?: 'critical' | 'high' | 'moderate' | 'healthy'
  req_p2?: number
  req_p1?: number
  req_change_pct?: number
  rev_p2?: number
  rev_p1?: number
  rev_change_pct?: number
  ecpm_p2?: number
  ecpm_p1?: number
  ecpm_change_pct?: number
  fill_rate_p2?: number
  fill_rate_p1?: number
  fill_rate_change_pct?: number
  root_cause?: string
}

export function CompactZoneCard({
  zid,
  zonename,
  status,
  risk_level,
  req_p2,
  req_p1,
  req_change_pct,
  rev_p2,
  rev_p1,
  rev_change_pct,
  ecpm_p2,
  ecpm_p1,
  ecpm_change_pct,
  fill_rate_p2,
  fill_rate_p1,
  fill_rate_change_pct,
  root_cause
}: CompactZoneCardProps) {

  // Determine border color based on risk level (minimal use of color)
  const getBorderColor = () => {
    if (status === 'new') return '#2E7D32' // Green
    if (status === 'lost') return '#757575' // Gray
    if (risk_level === 'critical') return '#C62828' // Red
    if (risk_level === 'high') return '#F57C00' // Orange
    if (risk_level === 'moderate') return '#FBC02D' // Yellow
    return '#E0E0E0' // Default gray
  }

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '-'
    return num.toLocaleString()
  }

  const formatCurrency = (num?: number) => {
    if (num === undefined || num === null) return '-'
    return `$${safeToFixed(num, 2)}`
  }

  const formatPercent = (num?: number) => {
    if (num === undefined || num === null) return '-'
    const sign = num > 0 ? '+' : ''
    return `${sign}${safeToFixed(num, 1)}%`
  }

  const getChangeColor = (change?: number) => {
    if (!change) return '#757575'
    return change > 0 ? '#2E7D32' : '#C62828'
  }

  return (
    <Card
      className="hover:shadow-md transition-shadow"
      style={{
        borderLeft: `4px solid ${getBorderColor()}`,
        backgroundColor: '#FFFFFF',
        border: `1px solid #E0E0E0`,
        borderLeftWidth: '4px',
        borderLeftColor: getBorderColor()
      }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {zonename}
            </div>
            <div className="text-xs text-gray-500">
              Zone ID: {zid}
            </div>
          </div>

          {/* Status/Risk Badge */}
          {status && status !== 'existing' && (
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: status === 'new' ? colors.status.successBg : colors.surface.muted,
                color: status === 'new' ? colors.status.success : colors.text.secondary
              }}
            >
              {status.toUpperCase()}
            </span>
          )}

          {risk_level && risk_level !== 'healthy' && status === 'existing' && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{
              backgroundColor: risk_level === 'critical' ? colors.status.dangerBg :
                             risk_level === 'high' ? colors.status.warningBg : colors.status.warningBg,
              color: risk_level === 'critical' ? colors.status.danger :
                     risk_level === 'high' ? colors.status.warning : colors.status.warning
            }}>
              <AlertTriangle size={12} />
              {risk_level.toUpperCase()}
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {/* Requests */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Requests</div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {formatNumber(req_p2)}
              </span>
              {req_change_pct !== undefined && (
                <span
                  className="text-xs flex items-center gap-0.5"
                  style={{ color: getChangeColor(req_change_pct) }}
                >
                  {safeNumber(req_change_pct) > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {formatPercent(req_change_pct)}
                </span>
              )}
            </div>
            {req_p1 !== undefined && (
              <div className="text-xs text-gray-400 mt-0.5">
                vs {formatNumber(req_p1)}
              </div>
            )}
          </div>

          {/* Revenue */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Revenue</div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(rev_p2)}
              </span>
              {rev_change_pct !== undefined && (
                <span
                  className="text-xs flex items-center gap-0.5"
                  style={{ color: getChangeColor(rev_change_pct) }}
                >
                  {safeNumber(rev_change_pct) > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {formatPercent(rev_change_pct)}
                </span>
              )}
            </div>
            {rev_p1 !== undefined && (
              <div className="text-xs text-gray-400 mt-0.5">
                vs {formatCurrency(rev_p1)}
              </div>
            )}
          </div>

          {/* eCPM */}
          <div>
            <div className="text-xs text-gray-500 mb-1">eCPM</div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(ecpm_p2)}
              </span>
              {ecpm_change_pct !== undefined && (
                <span
                  className="text-xs flex items-center gap-0.5"
                  style={{ color: getChangeColor(ecpm_change_pct) }}
                >
                  {safeNumber(ecpm_change_pct) > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {formatPercent(ecpm_change_pct)}
                </span>
              )}
            </div>
            {ecpm_p1 !== undefined && (
              <div className="text-xs text-gray-400 mt-0.5">
                vs {formatCurrency(ecpm_p1)}
              </div>
            )}
          </div>

          {/* Fill Rate */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Fill Rate</div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {fill_rate_p2?.toFixed(1)}%
              </span>
              {fill_rate_change_pct !== undefined && (
                <span
                  className="text-xs flex items-center gap-0.5"
                  style={{ color: getChangeColor(fill_rate_change_pct) }}
                >
                  {safeNumber(fill_rate_change_pct) > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {formatPercent(fill_rate_change_pct)}
                </span>
              )}
            </div>
            {fill_rate_p1 !== undefined && (
              <div className="text-xs text-gray-400 mt-0.5">
                vs {safeToFixed(fill_rate_p1, 1)}%
              </div>
            )}
          </div>
        </div>

        {/* Root Cause (if applicable) */}
        {root_cause && root_cause !== '-' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">Root Cause</div>
            <div className="text-xs font-medium text-gray-700 mt-1">
              {root_cause}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
