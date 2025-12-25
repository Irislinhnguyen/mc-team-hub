'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import type { StatusBreakdown } from '@/lib/types/dashboard'

interface Props {
  data: StatusBreakdown[]
}

export function StatusFunnelChart({ data }: Props) {
  // Format number for display
  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return '0'
    if (value === 0) return '0'
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-sm mb-1">{data.status_name}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Deals:</span>
            <span className="font-medium">{data.count}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Total Value:</span>
            <span className="font-medium">${formatValue(data.total_value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Weighted:</span>
            <span className="font-medium">${formatValue(data.weighted_value)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Probability:</span>
            <span className="font-medium">{data.estimate_percent}%</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Pipeline by Stage</CardTitle>
        <p className="text-sm text-gray-500">Deal distribution across pipeline stages</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              tickFormatter={formatValue}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              dataKey="status"
              type="category"
              width={60}
              style={{ fontSize: '12px', fontWeight: 500 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
            <Bar dataKey="weighted_value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.status_color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center gap-6 flex-wrap text-xs">
          {data.map(stage => (
            <div key={stage.status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: stage.status_color }}
              />
              <span className="font-medium">{stage.status}</span>
              <span className="text-gray-500">({stage.count})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
