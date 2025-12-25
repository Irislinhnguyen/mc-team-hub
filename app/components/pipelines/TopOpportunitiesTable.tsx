'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TopOpportunity } from '@/lib/types/dashboard'

interface Props {
  deals: TopOpportunity[]
}

export function TopOpportunitiesTable({ deals }: Props) {
  // Format number for display
  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return '$0'
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const hasDeals = deals.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Top Opportunities</CardTitle>
        <p className="text-sm text-gray-500">
          {hasDeals ? 'Highest-value deals in pipeline' : 'No opportunities to display'}
        </p>
      </CardHeader>
      <CardContent>
        {!hasDeals ? (
          <div className="py-12 text-center text-gray-400">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-sm">No deals in pipeline</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600 text-xs">#</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Publisher</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Stage</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 text-xs">Value</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">POC</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal, index) => (
                  <tr
                    key={deal.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-2 text-gray-500 font-medium">{index + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">
                        {deal.publisher}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: deal.status_color }}
                        />
                        <span className="text-xs font-medium text-gray-700">
                          {deal.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-semibold text-gray-900">
                        {formatValue(deal.q_gross)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-gray-600 text-xs">{deal.poc}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-xs text-gray-500 truncate max-w-[180px]">
                        {deal.next_action || '-'}
                      </p>
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
