import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '../../config/queryClient'
import { useCrossFilter } from '../../../app/contexts/CrossFilterContext'
import { extractBaseFilters } from '../../utils/filterHelpers'

/**
 * useDeepDive - React Query hook for Deep Dive data
 *
 * Optimized for client-side cross-filtering:
 * - Base filters (date range, team, etc.) → trigger API calls
 * - Cross-filters (clicking cells/charts) → client-side only, instant
 */
export function useDeepDive(filters: Record<string, any>) {
  const { crossFilters } = useCrossFilter()
  const baseFilters = extractBaseFilters(filters, crossFilters)

  return useQuery({
    queryKey: queryKeys.deepDive(baseFilters),
    queryFn: async () => {
      const response = await fetch('/api/performance-tracker/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseFilters),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch deep dive data`)
      }

      const result = await response.json()

      if (result.status === 'success' || result.status === 'ok') {
        return result.data
      } else {
        throw new Error(result.message || 'Unknown error fetching deep dive')
      }
    },
    enabled: !!(baseFilters.startDate && baseFilters.endDate),
    staleTime: cacheConfig.dailyAnalytics.staleTime,
    gcTime: cacheConfig.dailyAnalytics.gcTime,
    retry: 2,
  })
}
