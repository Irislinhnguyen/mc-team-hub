import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '../../config/queryClient'
import { useCrossFilter } from '../../../app/contexts/CrossFilterContext'
import { extractBaseFilters } from '../../utils/filterHelpers'

/**
 * useGCPPPartnerBreakdown2 - React Query hook for GCPP Partner Breakdown 2 data
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
 * const { data, isLoading, error, refetch } = useGCPPPartnerBreakdown2({
 *   date: '2025-01-15',
 *   team: ['WEB'],
 *   partner: ['Google'],
 * })
 */
export function useGCPPPartnerBreakdown2(filters: Record<string, any>) {
  const { crossFilters } = useCrossFilter()
  const baseFilters = extractBaseFilters(filters, crossFilters)

  return useQuery({
    queryKey: queryKeys.gcppPartnerBreakdown2(baseFilters),
    queryFn: async () => {
      const response = await fetch('/api/gcpp-check/partner-breakdown-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseFilters),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch partner breakdown 2 data`)
      }

      const result = await response.json()

      if (result.status === 'ok') {
        return result.data
      } else {
        throw new Error(result.message || 'Unknown error fetching partner breakdown 2')
      }
    },
    enabled: Object.keys(baseFilters).length > 0,
    // Daily data - cache for 1 hour
    staleTime: cacheConfig.dailyAnalytics.staleTime,
    gcTime: cacheConfig.dailyAnalytics.gcTime,
    retry: 2,
    // ✅ Use global refetchOnMount: false from queryClient config for better caching
  })
}
