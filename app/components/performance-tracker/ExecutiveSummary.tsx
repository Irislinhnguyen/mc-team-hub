'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercent } from '../../../lib/utils/formatters'
import { getTierInfo } from '../../../lib/utils/tierClassification'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'

interface ExecutiveSummaryProps {
  data: any[]
  level: 'product' | 'pid' | 'mid' | 'pic' | 'team'
  period1: { start: string; end: string }
  period2: { start: string; end: string }
  onRefreshAI?: () => void
  aiInsights?: string | null
  loadingAI?: boolean
  className?: string
}

export default function ExecutiveSummary({
  data,
  level,
  period1,
  period2,
  onRefreshAI,
  aiInsights,
  loadingAI = false,
  className = ''
}: ExecutiveSummaryProps) {
  const levelLabels: Record<string, string> = {
    team: 'Teams',
    pic: 'PICs',
    pid: 'Publishers',
    mid: 'Media',
    product: 'Products'
  }

  // Calculate aggregate metrics
  const totalRevP1 = data.reduce((sum, item) => sum + (item.total_rev_p1 || 0), 0)
  const totalRevP2 = data.reduce((sum, item) => sum + (item.total_rev_p2 || 0), 0)
  const revChangePct = totalRevP1 > 0 ? ((totalRevP2 - totalRevP1) / totalRevP1) * 100 : 0

  // Average fill rate
  const avgFillRate = data.length > 0
    ? data.reduce((sum, item) => sum + (item.avg_fill_rate_p2 || 0), 0) / data.length
    : 0

  const getChangeIcon = (changePct: number) => {
    if (changePct > 0) return <TrendingUp className="w-4 h-4" />
    if (changePct < 0) return <TrendingDown className="w-4 h-4" />
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Simplified Header - Inline */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
        <div className="text-xs text-gray-500">
          {period1.start} - {period1.end} vs {period2.start} - {period2.end}
        </div>
      </div>

      {/* Streamlined Metrics - Compact */}
      <div className="grid grid-cols-4 gap-3">
        {/* Total Revenue */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevP2)}</p>
            <div className="flex items-center gap-1 mt-1">
              {getChangeIcon(revChangePct)}
              <span className={`text-xs font-medium ${revChangePct > 0 ? 'text-green-600' : revChangePct < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {formatPercent(revChangePct)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Items */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Total {levelLabels[level]}</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(data.length)}</p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </CardContent>
        </Card>

        {/* Average Fill Rate */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Fill Rate</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercent(avgFillRate)}</p>
            <p className="text-xs text-gray-500 mt-1">Period 2</p>
          </CardContent>
        </Card>

        {/* Average Health Score */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Health</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.length > 0
                ? Math.round(data.reduce((sum, item) => sum + (item.health_score || 0), 0) / data.length)
                : 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Out of 100</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights - Full Width */}
      {onRefreshAI && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">AI Strategic Insights</h3>
              <button
                onClick={onRefreshAI}
                disabled={loadingAI}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
              >
                {loadingAI ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {loadingAI ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : aiInsights ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm">
                {aiInsights}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Click "Refresh" to generate AI analysis</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
