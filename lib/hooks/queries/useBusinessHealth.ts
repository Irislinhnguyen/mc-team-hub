import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '../../config/queryClient'
import { useCrossFilter } from '../../../app/contexts/CrossFilterContext'
import { extractBaseFilters } from '../../utils/filterHelpers'

/**
 * useBusinessHealth - React Query hook for Business Health data
 *
 * Optimized for client-side cross-filtering:
 * - Base filters (date range, team, etc.) → trigger API calls
 * - Cross-filters (clicking cells/charts) → client-side only, instant
 */
export function useBusinessHealth(filters: Record<string, any>) {
  const { crossFilters } = useCrossFilter()
  const baseFilters = extractBaseFilters(filters, crossFilters)

  return useQuery({
    queryKey: queryKeys.businessHealth(baseFilters),
    queryFn: async () => {
      const response = await fetch('/api/performance-tracker/business-health-filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseFilters),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch business health data`)
      }

      const result = await response.json()

      if (result.status === 'success' || result.status === 'ok') {
        return result.data
      } else {
        throw new Error(result.message || 'Unknown error fetching business health')
      }
    },
    enabled: !!(baseFilters.startDate && baseFilters.endDate),
    staleTime: cacheConfig.dailyAnalytics.staleTime,
    gcTime: cacheConfig.dailyAnalytics.gcTime,
    retry: 2,
  })
}
