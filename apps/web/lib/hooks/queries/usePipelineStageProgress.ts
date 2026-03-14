/**
 * React Query hook for fetching pipeline stage progress data
 *
 * Features:
 * - POC-specific average days remaining to reach S
 * - Current stage entry date for each pipeline
 * - Expected date to reach S
 * - Automatic caching and invalidation support
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '@/lib/config/queryClient'
import type { PipelineGroup } from '@query-stream-ai/types/pipeline'

interface UsePipelineStageProgressOptions {
  group: PipelineGroup
  fiscalYear?: number | null
  fiscalQuarter?: number | null
  teams?: string[] | null
  pocs?: string[] | null
  products?: string[] | null
  statuses?: string[] | null
}

interface PipelineStageProgress {
  pipeline_id: string
  poc: string
  current_status: string
  current_stage_group: string | null
  current_stage_entry_date: string | null
  avg_days_to_S: number | null
  expected_S_date: string | null
}

interface PipelineStageProgressResponse {
  pipelines: PipelineStageProgress[]
}

export function usePipelineStageProgress(options: UsePipelineStageProgressOptions) {
  // Build query string from filters
  const params = new URLSearchParams()
  params.append('group', options.group)

  if (options.fiscalYear) params.append('fiscal_year', options.fiscalYear.toString())
  if (options.fiscalQuarter) params.append('fiscal_quarter', options.fiscalQuarter.toString())
  if (options.teams && options.teams.length > 0) params.append('teams', options.teams.join(','))
  if (options.pocs && options.pocs.length > 0) params.append('pocs', options.pocs.join(','))
  if (options.products && options.products.length > 0) params.append('products', options.products.join(','))
  if (options.statuses && options.statuses.length > 0) params.append('statuses', options.statuses.join(','))

  const queryString = params.toString()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.pipelines.stageProgress(options.group, queryString),
    queryFn: async () => {
      const url = `/api/pipelines/pipeline-stage-progress?${queryString}`
      console.log('[usePipelineStageProgress] Fetching:', url)

      try {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
        })

        console.log('[usePipelineStageProgress] Got response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[usePipelineStageProgress] Error response:', errorText)
          throw new Error(`Failed to fetch pipeline stage progress: ${response.status} ${errorText}`)
        }

        const result = await response.json()
        console.log('[usePipelineStageProgress] RAW result:', result)
        console.log('[usePipelineStageProgress] Parsed response:', {
          hasData: !!result.data,
          pipelinesCount: result.data?.pipelines?.length || 0,
          firstPipelines: result.data?.pipelines?.slice(0, 2)
        })
        return result.data as PipelineStageProgressResponse
      } catch (err) {
        console.error('[usePipelineStageProgress] Exception:', err)
        throw err
      }
    },
    enabled: options.fiscalYear !== null && options.fiscalQuarter !== null,
    staleTime: cacheConfig.stale.medium,
    gcTime: cacheConfig.gc.long,
    refetchOnWindowFocus: false,
  })

  if (error) {
    console.error('[usePipelineStageProgress] Query error:', error)
  }

  return {
    data: data ?? { pipelines: [] },
    loading: isLoading,
    error,
    refetch,
  }
}
