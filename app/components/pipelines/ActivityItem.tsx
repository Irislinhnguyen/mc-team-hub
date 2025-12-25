'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PipelineActivityLogWithUser } from '@/lib/types/pipeline'
import {
  formatActivity,
  formatActivityType,
  formatTimeAgo,
  getUserInitials,
  getBadgeVariant,
} from '@/lib/utils/activityFormatter'

interface ActivityItemProps {
  activity: PipelineActivityLogWithUser
  isLast?: boolean
}

export function ActivityItem({ activity, isLast = false }: ActivityItemProps) {
  const { Icon, color, description } = formatActivity(activity)
  const userInitials = getUserInitials(activity.user_name)
  const timeAgo = formatTimeAgo(activity.logged_at)
  const badgeVariant = getBadgeVariant(activity.activity_type)
  const activityLabel = formatActivityType(activity.activity_type)

  return (
    <div className="flex gap-3">
      {/* Timeline dot and connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2',
            color
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="h-full w-0.5 bg-border mt-2" />}
      </div>

      {/* Activity content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={badgeVariant}>{activityLabel}</Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        <div className="mt-1 text-sm text-foreground">{description}</div>

        {/* User attribution */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {userInitials}
          </div>
          <span className="text-xs text-muted-foreground">
            {activity.user_name || activity.user_email || 'Unknown User'}
          </span>
        </div>
      </div>
    </div>
  )
}
