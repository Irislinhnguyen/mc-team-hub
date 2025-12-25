'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { PipelineActivityLogWithUser } from '@/lib/types/pipeline'
import { ActivityItem } from './ActivityItem'

interface ActivityTimelineProps {
  activities: PipelineActivityLogWithUser[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
}

export function ActivityTimeline({
  activities,
  loading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: ActivityTimelineProps) {
  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading activities...</div>
      </div>
    )
  }

  if (!loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground text-center">
          No activity yet
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-0">
        {activities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isLast={index === activities.length - 1 && !hasMore}
          />
        ))}

        {hasMore && onLoadMore && (
          <div className="pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
