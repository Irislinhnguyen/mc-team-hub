import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '../../config/queryClient'
import { useCrossFilter } from '../../../app/contexts/CrossFilterContext'
import { extractBaseFilters } from '../../utils/filterHelpers'

/**
 * useGCPPMarketOverview - React Query hook for GCPP Market Overview data
 *
 * Optimized for client-side cross-filtering:
 * - Base filters (date, team, partner) → trigger API calls
 * - Cross-filters (clicking cells/charts) → client-side only, instant
 *
 * Automatically caches data for 1 hour (data updates daily, so caching is aggressive)
 * Prevents unnecessary API calls when switching tabs
 *
 * @param filters - Filter object containing date/dateRange and other filters
 * @returns React Query result with data, loading state, and error
 *
 * @example
 * const { data, isLoading, error, refetch } = useGCPPMarketOverview({
 *   date: '2025-01-15',
 *   team: ['WEB'],
 *   partner: ['Google'],
 * })
 */
export function useGCPPMarketOverview(filters: Record<string, any>) {
  const { crossFilters } = useCrossFilter()

  // Extract only base filters (exclude cross-filters) for query key
  // This ensures cache is reused across different cross-filter selections
  const baseFilters = extractBaseFilters(filters, crossFilters)

  return useQuery({
    // Use base filters only in query key - cross-filters don't affect cache
    queryKey: queryKeys.gcppMarketOverview(baseFilters),
    queryFn: async () => {
      // Send base filters to API (server doesn't filter by cross-filter fields)
      const response = await fetch('/api/gcpp-check/market-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseFilters),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch market overview data`)
      }

      const result = await response.json()

      if (result.status === 'ok') {
        return result.data
      } else {
        throw new Error(result.message || 'Unknown error fetching market overview')
      }
    },
    // Only fetch if we have any filters (at minimum date/dateRange should be present)
    enabled: Object.keys(baseFilters).length > 0,
    // Daily data - cache for 1 hour
    staleTime: cacheConfig.dailyAnalytics.staleTime,
    gcTime: cacheConfig.dailyAnalytics.gcTime,
    retry: 2,
    // ✅ Use global refetchOnMount: false from queryClient config for better caching
  })
}
