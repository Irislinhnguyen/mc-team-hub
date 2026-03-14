import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '../../config/queryClient'
import { useCrossFilter } from '../../../app/contexts/CrossFilterContext'
import { extractBaseFilters } from '../../utils/filterHelpers'

/**
 * useProfitProjections - React Query hook for Profit Projections data
 *
 * Optimized for client-side cross-filtering:
 * - Base filters (team, pic, product, etc.) → trigger API calls
 * - Cross-filters (clicking cells/charts) → client-side only, instant
 *
 * Note: weekly_prediction_table is a snapshot table without DATE column,
 * so date filters are not required or used by the API.
 */
export function useProfitProjections(filters: Record<string, any>) {
  const { crossFilters } = useCrossFilter()
  const baseFilters = extractBaseFilters(filters, crossFilters)

  return useQuery({
    queryKey: queryKeys.profitProjections(baseFilters),
    queryFn: async () => {
      const response = await fetch('/api/performance-tracker/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseFilters),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch profit projections data`)
      }

      const result = await response.json()

      if (result.status === 'success' || result.status === 'ok') {
        return result.data
      } else {
        throw new Error(result.message || 'Unknown error fetching profit projections')
      }
    },
    enabled: true, // No date filter needed - snapshot table without DATE column
    staleTime: cacheConfig.dailyAnalytics.staleTime,
    gcTime: cacheConfig.dailyAnalytics.gcTime,
    retry: 2,
  })
}
