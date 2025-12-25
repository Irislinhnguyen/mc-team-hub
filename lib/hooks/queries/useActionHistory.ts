/**
 * React Query hook for fetching action history
 * Fetches action_update activities and groups them into complete snapshots
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '@/lib/config/queryClient'
import type { PipelineActivityLogWithUser } from '@/lib/types/pipeline'
import { groupActionHistory, type ActionSnapshot } from '@/lib/utils/actionHistoryGrouper'

interface ActivitiesResponse {
  data: PipelineActivityLogWithUser[]
  total: number
  has_more: boolean
}

/**
 * Fetch action history for a pipeline
 * Returns grouped action snapshots
 */
export function useActionHistory(pipelineId: string, limit = 50) {
  return useQuery<ActionSnapshot[]>({
    queryKey: [...queryKeys.pipelines.activities(pipelineId), 'action_history'],
    queryFn: async () => {
      // Fetch only action_update activities
      const response = await fetch(
        `/api/pipelines/${pipelineId}/activities?type=action_update&limit=${limit}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch action history')
      }

      const result: ActivitiesResponse = await response.json()

      // Group activity logs into complete action snapshots
      const snapshots = groupActionHistory(result.data)

      return snapshots
    },
    staleTime: cacheConfig.pipelines.staleTime,
    gcTime: cacheConfig.pipelines.gcTime,
  })
}
