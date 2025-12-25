'use client'

import { Calendar } from 'lucide-react'
import type { ActionSnapshot } from '@/lib/utils/actionHistoryGrouper'

interface ActionHistoryItemProps {
  action: ActionSnapshot
}

export function ActionHistoryItem({ action }: ActionHistoryItemProps) {
  // Format timestamp
  const date = new Date(action.timestamp)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  // Check if there's any data to show (exclude progress)
  const hasData =
    action.action_date ||
    action.next_action ||
    action.action_detail

  if (!hasData) return null

  return (
    <div className="border-l-2 border-muted pl-3 py-2 space-y-2">
      {/* Header with timestamp and user */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span className="font-medium">
          {formattedDate} at {formattedTime}
        </span>
        <span>•</span>
        <span>{action.user}</span>
      </div>

      {/* Action fields (only show non-empty ones) */}
      <div className="space-y-1 text-xs">
        {action.action_date && (
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground min-w-[80px]">
              Action Date:
            </span>
            <span className="text-foreground">
              {new Date(action.action_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {action.next_action && (
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground min-w-[80px]">
              Next Action:
            </span>
            <span className="text-foreground">{action.next_action}</span>
          </div>
        )}

        {action.action_detail && (
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground min-w-[80px]">
              Details:
            </span>
            <span className="text-foreground">{action.action_detail}</span>
          </div>
        )}
      </div>
    </div>
  )
}
