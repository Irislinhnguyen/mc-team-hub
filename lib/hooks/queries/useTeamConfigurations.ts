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

  return response.json()
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
