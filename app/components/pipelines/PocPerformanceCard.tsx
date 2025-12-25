'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { PocPerformance } from '@/lib/types/dashboard'

interface Props {
  data: PocPerformance
}

export function PocPerformanceCard({ data }: Props) {
  // Format number for display
  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return '$0'
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 truncate">
          {data.poc}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-3xl font-bold text-gray-900">{data.count}</p>
          <p className="text-xs text-gray-500">active deals</p>
        </div>

        <div className="space-y-1.5 text-sm border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Total Value:</span>
            <span className="font-semibold text-gray-900">
              {formatValue(data.total_value)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Weighted:</span>
            <span className="font-semibold text-gray-900">
              {formatValue(data.weighted_value)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Win Rate:</span>
            <span className="font-semibold text-green-600">
              {data.win_rate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Avg Deal:</span>
            <span className="font-medium text-gray-700">
              {formatValue(data.avg_deal_size)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
