'use client'

import { usePipelineActivities } from '@/lib/hooks/queries/usePipelineActivities'
import { ActivityTimeline } from './ActivityTimeline'

interface ActivityLogViewProps {
  pipelineId: string
}

export function ActivityLogView({ pipelineId }: ActivityLogViewProps) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePipelineActivities(pipelineId)

  // Flatten all pages into single array and filter out note entries
  // (since we removed the Add Note feature, users will use Progress Notes field instead)
  const activities = data?.pages.flatMap((page) =>
    page.data.filter(activity => activity.activity_type !== 'note')
  ) ?? []

  return (
    <div className="space-y-6">
      {/* Activity History */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Activity History</h3>
        <ActivityTimeline
          activities={activities}
          loading={isLoading}
          hasMore={hasNextPage}
          onLoadMore={() => fetchNextPage()}
          loadingMore={isFetchingNextPage}
        />
      </div>
    </div>
  )
}
