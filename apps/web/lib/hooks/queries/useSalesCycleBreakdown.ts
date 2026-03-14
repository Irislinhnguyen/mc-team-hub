/**
 * React Query hook for fetching sales cycle breakdown data
 *
 * Features:
 * - Automatic caching (5-minute stale time, 10-minute gc time)
 * - Re-fetches when filters change
 * - Supports invalidation
 * - Returns average days per stage transition
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '@/lib/config/queryClient'
import type { PipelineGroup } from '@query-stream-ai/types/pipeline'

interface SalesCycleBreakdownFilters {
  fiscalYear?: number | null
  fiscalQuarter?: number | null
  teams?: string[]
  pocs?: string[]
  products?: string[]
  statuses?: string[]
}

interface TransitionData {
  avg_days: number | null
  count: number
}

interface SalesCycleBreakdownResponse {
  transitions: Record<string, TransitionData>
  total_cycle: TransitionData
}

export function useSalesCycleBreakdown(
  group: PipelineGroup,
  filters?: SalesCycleBreakdownFilters
) {
  // Build query string from filters
  const params = new URLSearchParams()
  params.append('group', group)

  if (filters?.fiscalYear) params.append('fiscal_year', filters.fiscalYear.toString())
  if (filters?.fiscalQuarter) params.append('fiscal_quarter', filters.fiscalQuarter.toString())
  if (filters?.teams && filters.teams.length > 0) params.append('teams', filters.teams.join(','))
  if (filters?.pocs && filters.pocs.length > 0) params.append('pocs', filters.pocs.join(','))
  if (filters?.products && filters.products.length > 0) params.append('products', filters.products.join(','))
  if (filters?.statuses && filters.statuses.length > 0) params.append('statuses', filters.statuses.join(','))

  const queryString = params.toString()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.pipelines.salesCycleBreakdown(group, queryString),
    queryFn: async () => {
      const url = `/api/pipelines/sales-cycle-breakdown?${queryString}`
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sales cycle breakdown')
      }

      const result = await response.json()
      return result.data as SalesCycleBreakdownResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })

  return {
    data: data?.transitions ?? {},
    totalCycle: data?.total_cycle ?? { avg_days: null, count: 0 },
    loading: isLoading,
    error,
    refetch,
  }
}
