import { useQuery } from '@tanstack/react-query'
import type { TeamConfiguration, TeamPicMapping, TeamProductPattern } from '../../supabase/database.types'

interface TeamConfigurationsResponse {
  teams: TeamConfiguration[]
  picMappings: TeamPicMapping[]
  productPatterns: TeamProductPattern[]
}

/**
 * Fetch team configurations from API
 */
async function fetchTeamConfigurations(): Promise<TeamConfigurationsResponse> {
  const response = await fetch('/api/teams/configurations')

  if (!response.ok) {
    throw new Error(`Failed to fetch team configurations: ${response.statusText}`)
  }

  const data = await response.json()

  // Log warning if picMappings is empty (will break PIC-level drill-down)
  if (!data.picMappings || data.picMappings.length === 0) {
    console.warn('⚠️ [useTeamConfigurations] Received empty picMappings from API')
    console.warn('   This will prevent PIC-level drill-down from working')
    console.warn('   Teams loaded:', data.teams?.length || 0)
    console.warn('   Product patterns loaded:', data.productPatterns?.length || 0)
    if (data.warning) {
      console.warn('   Server warning:', data.warning)
    }
    if (data.error) {
      console.error('   Server error:', data.error)
    }
  }

  return data
}

/**
 * React Query hook for team configurations
 * Cached for 1 hour since team data changes infrequently (daily updates)
 */
export function useTeamConfigurations() {
  return useQuery({
    queryKey: ['teamConfigurations'],
    queryFn: fetchTeamConfigurations,
    staleTime: 1 * 60 * 60 * 1000, // 1 hour - team data updates daily
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in memory
    refetchOnWindowFocus: false
  })
}
