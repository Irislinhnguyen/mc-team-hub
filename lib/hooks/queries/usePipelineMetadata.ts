/**
 * React Query hook for Pipeline Metadata with long-term caching
 *
 * Metadata includes:
 * - Team configurations
 * - POC names
 * - POC-to-team mappings
 *
 * This data rarely changes, so we cache aggressively (24 hours)
 *
 * Performance optimizations:
 * - 24hr stale time (metadata changes infrequently)
 * - 48hr garbage collection time
 * - No automatic refetching
 * - Parallel fetch with pipelines (no waterfall)
 *
 * Expected performance:
 * - First load: 300-500ms
 * - Cached loads: 0ms (instant)
 */

import { useQuery } from '@tanstack/react-query'

interface PipelineMetadata {
  teams: Array<{
    team_id: string
    team_name: string
    description?: string
  }>
  pocNames: string[]
  pocTeamMapping: Record<string, string>
}

export function usePipelineMetadata() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pipeline-metadata'],
    queryFn: async () => {
      const response = await fetch('/api/pipelines/metadata', {
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch pipeline metadata')
      }

      return await response.json() as PipelineMetadata
    },
    // Long-term caching - metadata rarely changes
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    gcTime: 48 * 60 * 60 * 1000,      // 48 hours

    // No automatic refetching - manual invalidation only
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,

    retry: 3,
  })

  return {
    metadata: data ?? { teams: [], pocNames: [], pocTeamMapping: {} },
    loading: isLoading,
    error,
    refetch,
  }
}
