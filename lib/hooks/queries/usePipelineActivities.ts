/**
 * React Query hooks for pipeline activity logs
 *
 * Features:
 * - Fetch activity logs with pagination
 * - Add manual notes to pipelines
 * - Automatic cache invalidation
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '@/lib/config/queryClient'
import type { PipelineActivityLogWithUser } from '@/lib/types/pipeline'

interface ActivitiesResponse {
  data: PipelineActivityLogWithUser[]
  total: number
  has_more: boolean
}

interface AddNoteResponse {
  data: PipelineActivityLogWithUser
  message: string
}

/**
 * Fetch activity logs for a pipeline with pagination
 */
export function usePipelineActivities(pipelineId: string, limit = 20) {
  return useInfiniteQuery<ActivitiesResponse>({
    queryKey: queryKeys.pipelines.activities(pipelineId),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `/api/pipelines/${pipelineId}/activities?limit=${limit}&offset=${pageParam}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch activities')
      }

      return response.json()
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.has_more) return undefined
      return pages.length * limit
    },
    initialPageParam: 0,
    staleTime: cacheConfig.pipelines.staleTime,
    gcTime: cacheConfig.pipelines.gcTime,
  })
}

/**
 * Add a manual note to a pipeline
 */
export function useAddPipelineNote(pipelineId: string) {
  const queryClient = useQueryClient()

  return useMutation<AddNoteResponse, Error, string>({
    mutationFn: async (notes: string) => {
      const response = await fetch(`/api/pipelines/${pipelineId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add note')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate activities to refetch and show new note
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.activities(pipelineId),
      })
    },
  })
}
