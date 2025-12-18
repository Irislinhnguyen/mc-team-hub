import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { useCrossFilter } from '../../../app/contexts/CrossFilterContext'
import { extractBaseFilters } from '../../utils/filterHelpers'

export interface TeamBreakdownDataPoint {
  date: string
  rawDate: string
  team_id: string
  team_name: string
  revenue: number
  profit: number
  requests: number
  paid: number
}

export interface TeamBreakdownResponse {
  teamBreakdown: TeamBreakdownDataPoint[]
  metadata: {
    rowCount: number
    generatedAt: string
  }
}

/**
 * Fetch pre-aggregated team breakdown data from BigQuery
 * Uses 1-hour cache for daily analytics data
 *
 * Performance optimization: Uses extractBaseFilters to exclude cross-filters from query key
 * This prevents unnecessary API refetches when cross-filters change (client-side filtering only)
 */
export function useTeamBreakdown(
  filters: Record<string, any>,
  enabled = true
): UseQueryResult<TeamBreakdownResponse> {
  const { crossFilters } = useCrossFilter()
  const baseFilters = extractBaseFilters(filters, crossFilters)

  return useQuery({
    queryKey: ['team-breakdown', baseFilters],
    queryFn: async () => {
      console.log('[useTeamBreakdown] Fetching with baseFilters:', baseFilters)

      const response = await fetch('/api/performance-tracker/team-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseFilters)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.status !== 'ok') {
        throw new Error(result.message || 'Unknown error')
      }

      console.log('[useTeamBreakdown] Received', result.data.teamBreakdown.length, 'rows')

      return result.data
    },
    enabled,
    staleTime: 1 * 60 * 60 * 1000,  // 1 hour - team data updates daily
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours - keep in memory
    retry: 2,
    retryDelay: 1000
  })
}
