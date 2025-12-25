/**
 * React Query hook for fetching pipelines data with caching
 *
 * Features:
 * - Automatic caching (2-minute stale time, 5-minute gc time)
 * - No refetch on mount if data exists
 * - Background refresh when data becomes stale
 * - Request deduplication
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '@/lib/config/queryClient'
import type { Pipeline, PipelineGroup } from '@/lib/types/pipeline'

export function usePipelines(group?: PipelineGroup) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.pipelines.list(group),
    queryFn: async () => {
      const url = `/api/pipelines${group ? `?group=${group}` : ''}`
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch pipelines')
      }

      const json = await response.json()
      return json.data as Pipeline[]
    },
    staleTime: cacheConfig.pipelines.staleTime,
    gcTime: cacheConfig.pipelines.gcTime,
  })

  return {
    pipelines: data ?? [],
    loading: isLoading,
    error,
    refetch,
  }
}
