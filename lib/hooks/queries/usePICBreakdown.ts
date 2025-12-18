import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { useCrossFilter } from '../../../app/contexts/CrossFilterContext'
import { extractBaseFilters } from '../../utils/filterHelpers'

export interface PICBreakdownDataPoint {
  date: string
  rawDate: string
  pic_name: string
  revenue: number
  profit: number
  requests: number
  paid: number
}

export interface PICBreakdownResponse {
  picBreakdown: PICBreakdownDataPoint[]
  metadata: {
    team_id: string
    rowCount: number
    generatedAt: string
  }
}

/**
 * Fetch pre-aggregated PIC breakdown data for a specific team from BigQuery
 * Only fetches when team_id is provided (on-demand loading)
 * Uses 1-hour cache for daily analytics data
 *
 * Performance optimization: Uses extractBaseFilters to exclude cross-filters from query key
 * This prevents unnecessary API refetches when cross-filters change (client-side filtering only)
 */
export function usePICBreakdown(
  team_id: string | null,
  filters: Record<string, any>,
  enabled = true
): UseQueryResult<PICBreakdownResponse> {
  const { crossFilters } = useCrossFilter()
  const baseFilters = extractBaseFilters(filters, crossFilters)

  return useQuery({
    queryKey: ['pic-breakdown', team_id, baseFilters],
    queryFn: async () => {
      if (!team_id) {
        throw new Error('team_id is required for PIC breakdown')
      }

      console.log('[usePICBreakdown] Fetching for team:', team_id, 'with baseFilters:', baseFilters)

      const response = await fetch('/api/performance-tracker/pic-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id, ...baseFilters })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.status !== 'ok') {
        throw new Error(result.message || 'Unknown error')
      }

      console.log('[usePICBreakdown] Received', result.data.picBreakdown.length, 'rows for team:', team_id)

      return result.data
    },
    enabled: enabled && !!team_id,  // Only fetch if team_id provided
    staleTime: 1 * 60 * 60 * 1000,  // 1 hour - team data updates daily
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours - keep in memory
    retry: 2,
    retryDelay: 1000
  })
}
