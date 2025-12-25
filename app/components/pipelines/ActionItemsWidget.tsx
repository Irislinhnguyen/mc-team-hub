'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ActionItem } from '@/lib/types/dashboard'

interface Props {
  items: ActionItem[]
}

export function ActionItemsWidget({ items }: Props) {
  // Categorize by urgency
  const overdue = items.filter(i => i.days_until_action < 0)
  const today = items.filter(i => i.days_until_action === 0)
  const thisWeek = items.filter(i => i.days_until_action > 0 && i.days_until_action <= 7)

  const ActionItemRow = ({ item, urgency }: { item: ActionItem; urgency: 'overdue' | 'today' | 'week' }) => {
    const urgencyColors = {
      overdue: 'border-l-red-500 bg-red-50',
      today: 'border-l-orange-500 bg-orange-50',
      week: 'border-l-blue-500 bg-blue-50'
    }

    const formatValue = (value: number | null) => {
      if (value === null || value === undefined) return '$0'
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
      return `$${value}`
    }

    return (
      <div className={`p-3 rounded border-l-4 ${urgencyColors[urgency]} mb-2`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">
              {item.publisher}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {item.next_action || 'Follow up'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {item.q_gross && item.q_gross > 0 && (
              <p className="text-xs font-semibold text-gray-900">
                {formatValue(item.q_gross)}
              </p>
            )}
            <p className="text-xs text-gray-500">{item.poc}</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: item.status_color }}
          />
          <span className="text-xs text-gray-500">
            {item.days_until_action < 0
              ? `${Math.abs(item.days_until_action)}d overdue`
              : item.days_until_action === 0
              ? 'Today'
              : `In ${item.days_until_action}d`}
          </span>
        </div>
      </div>
    )
  }

  const hasItems = items.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Action Items</CardTitle>
        <p className="text-sm text-gray-500">
          {hasItems ? 'Upcoming and overdue actions' : 'No upcoming actions'}
        </p>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive" className="text-xs">
                    {overdue.length} Overdue
                  </Badge>
                </div>
                {overdue.slice(0, 3).map(item => (
                  <ActionItemRow key={item.id} item={item} urgency="overdue" />
                ))}
              </div>
            )}

            {today.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-orange-500 text-white text-xs">
                    {today.length} Today
                  </Badge>
                </div>
                {today.map(item => (
                  <ActionItemRow key={item.id} item={item} urgency="today" />
                ))}
              </div>
            )}

            {thisWeek.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {thisWeek.length} This Week
                  </Badge>
                </div>
                {thisWeek.slice(0, 5).map(item => (
                  <ActionItemRow key={item.id} item={item} urgency="week" />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
