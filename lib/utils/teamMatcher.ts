/**
 * Team Matcher Utility
 * Dynamically builds SQL WHERE conditions for team filters based on Supabase configurations
 * Uses 5-minute cache to minimize database queries
 */

import { createClient } from '@supabase/supabase-js'
import type { Database, TeamConfiguration, TeamPicMapping, TeamProductPattern } from '../supabase/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Use service role key for server-side operations (bypasses RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const hasSupabaseConfig = !!(supabaseUrl && supabaseServiceKey)

if (!hasSupabaseConfig) {
  console.warn('[teamMatcher] Missing Supabase environment variables - team configurations will be disabled')
  console.warn('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.warn('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
}

// Server-side Supabase client with service role (bypasses RLS)
// Only create client if env vars are available
const supabase = hasSupabaseConfig
  ? createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Cache structure
interface TeamConfigCache {
  teams: TeamConfiguration[]
  picMappings: TeamPicMapping[]
  productPatterns: TeamProductPattern[]
  timestamp: number
}

let configCache: TeamConfigCache | null = null
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch team configurations from Supabase with caching
 */
export async function getTeamConfigurations(): Promise<TeamConfigCache> {
  console.log('[teamMatcher] getTeamConfigurations called')

  // Return empty config if Supabase is not configured
  if (!hasSupabaseConfig || !supabase) {
    console.warn('[teamMatcher] Supabase not configured, returning empty team configurations')
    const emptyCache: TeamConfigCache = {
      teams: [],
      picMappings: [],
      productPatterns: [],
      timestamp: Date.now()
    }
    configCache = emptyCache
    return emptyCache
  }

  // Check cache validity
  if (configCache && Date.now() - configCache.timestamp < CACHE_DURATION_MS) {
    console.log('[teamMatcher] Using cached config')
    return configCache
  }

  console.log('[teamMatcher] Fetching fresh config from Supabase...')

  // Fetch fresh data from Supabase
  const [teamsResult, picMappingsResult, productPatternsResult] = await Promise.all([
    supabase
      .from('team_configurations')
      .select('*')
      .order('display_order'),
    supabase
      .from('team_pic_mappings')
      .select('*'),
    supabase
      .from('team_product_patterns')
      .select('*')
      .order('priority')
  ])

  console.log('[teamMatcher] Supabase results:')
  console.log('  - teams:', teamsResult.data?.length || 0, 'rows, error:', teamsResult.error)
  console.log('  - picMappings:', picMappingsResult.data?.length || 0, 'rows, error:', picMappingsResult.error)
  console.log('  - productPatterns:', productPatternsResult.data?.length || 0, 'rows, error:', productPatternsResult.error)

  if (teamsResult.error) {
    console.error('Error fetching team configurations:', teamsResult.error)
    console.warn('[teamMatcher] Using empty fallback for team configurations')
    // Return empty cache as fallback instead of throwing
    configCache = {
      teams: [],
      picMappings: [],
      productPatterns: [],
      timestamp: Date.now()
    }
    return configCache
  }

  if (picMappingsResult.error) {
    console.error('❌ [teamMatcher] Error fetching PIC mappings:', picMappingsResult.error)
    console.error('   Error details:', {
      message: picMappingsResult.error.message,
      details: picMappingsResult.error.details,
      hint: picMappingsResult.error.hint,
      code: picMappingsResult.error.code
    })
    console.warn('[teamMatcher] Using empty fallback for PIC mappings - drill-down will not work!')
    configCache = {
      teams: teamsResult.data || [],
      picMappings: [],
      productPatterns: [],
      timestamp: Date.now()
    }
    return configCache
  }

  if (productPatternsResult.error) {
    console.error('Error fetching product patterns:', productPatternsResult.error)
    console.warn('[teamMatcher] Using empty fallback for product patterns')
    configCache = {
      teams: teamsResult.data || [],
      picMappings: picMappingsResult.data || [],
      productPatterns: [],
      timestamp: Date.now()
    }
    return configCache
  }

  // Update cache
  configCache = {
    teams: teamsResult.data || [],
    picMappings: picMappingsResult.data || [],
    productPatterns: productPatternsResult.data || [],
    timestamp: Date.now()
  }

  console.log('[teamMatcher] Cache updated with', configCache.teams.length, 'teams')
  return configCache
}

/**
 * Clear the configuration cache (call after updates)
 */
export function clearTeamConfigCache(): void {
  configCache = null
}

/**
 * Build SQL WHERE condition for a single team filter
 */
export async function buildTeamCondition(teamId: string): Promise<string> {
  const config = await getTeamConfigurations()

  // Get PICs assigned to this team from Supabase
  const teamPics = config.picMappings
    .filter(mapping => mapping.team_id === teamId)
    .map(mapping => mapping.pic_name)

  // Use only explicit assignments from Supabase, no pattern fallbacks
  // This prevents double-counting when PICs are already assigned
  if (teamPics.length === 0) {
    return '1=0' // No PICs assigned to this team, match nothing
  }

  const picValues = teamPics.map(pic => `'${pic}'`).join(', ')
  return `pic IN (${picValues})`
}

/**
 * Build SQL WHERE conditions for multiple team filters
 */
export async function buildTeamConditions(teamIds: string[]): Promise<string> {
  console.log('[buildTeamConditions] Input team IDs:', teamIds)

  if (teamIds.length === 0) {
    console.log('[buildTeamConditions] No team IDs, returning empty string')
    return ''
  }

  const teamConditions = await Promise.all(
    teamIds.map(teamId => buildTeamCondition(teamId))
  )

  console.log('[buildTeamConditions] Individual conditions:', teamConditions)

  // Join multiple teams with OR (user selecting multiple teams)
  const result = `(${teamConditions.join(' OR ')})`
  console.log('[buildTeamConditions] Final result:', result)
  return result
}

/**
 * Get all PICs from BigQuery that are not assigned to any team
 * This is used for the "Unassigned Pool" in the drag-and-drop UI
 */
export async function getUnassignedPics(allPicsFromBigQuery: string[]): Promise<string[]> {
  const config = await getTeamConfigurations()
  const assignedPics = new Set(config.picMappings.map(m => m.pic_name))

  return allPicsFromBigQuery.filter(pic => !assignedPics.has(pic))
}

/**
 * Get all teams with their assigned PICs
 */
export async function getTeamsWithPics(): Promise<Array<{
  team: TeamConfiguration
  pics: string[]
}>> {
  console.log('[teamMatcher] Getting teams with PICs...')
  const config = await getTeamConfigurations()
  console.log('[teamMatcher] Config loaded - teams:', config.teams.length, 'picMappings:', config.picMappings.length)

  const result = config.teams.map(team => ({
    team,
    pics: config.picMappings
      .filter(m => m.team_id === team.team_id)
      .map(m => m.pic_name)
  }))

  console.log('[teamMatcher] Result:', JSON.stringify(result, null, 2))
  return result
}

/**
 * Assign a PIC to a team
 */
export async function assignPicToTeam(picName: string, teamId: string, userEmail?: string): Promise<void> {
  // First, remove PIC from any existing team (UNIQUE constraint)
  await supabase
    .from('team_pic_mappings')
    .delete()
    .eq('pic_name', picName)

  // Then insert new assignment with tracking
  const insertData: Database['public']['Tables']['team_pic_mappings']['Insert'] = {
    team_id: teamId,
    pic_name: picName,
    updated_by_email: userEmail || null
  }

  const { error } = await (supabase
    .from('team_pic_mappings')
    .insert(insertData as any) as any)

  if (error) {
    console.error('Error assigning PIC to team:', error)
    throw new Error(`Failed to assign ${picName} to ${teamId}`)
  }

  // Clear cache after modification
  clearTeamConfigCache()
}

/**
 * Remove a PIC from their current team
 */
export async function removePicFromTeam(picName: string): Promise<void> {
  const { error } = await supabase
    .from('team_pic_mappings')
    .delete()
    .eq('pic_name', picName)

  if (error) {
    console.error('Error removing PIC from team:', error)
    throw new Error(`Failed to remove ${picName} from team`)
  }

  // Clear cache after modification
  clearTeamConfigCache()
}

/**
 * Get all PIC assignments with tracking info for table view
 */
export async function getAllPicAssignments(): Promise<Array<{
  pic_name: string
  team_id: string | null
  team_name: string | null
  updated_at: string | null
  updated_by_email: string | null
}>> {
  const config = await getTeamConfigurations()

  // Get all mappings with their team names
  const assignments = config.picMappings.map(mapping => {
    const team = config.teams.find(t => t.team_id === mapping.team_id)
    return {
      pic_name: mapping.pic_name,
      team_id: mapping.team_id,
      team_name: team?.team_name || mapping.team_id,
      updated_at: mapping.updated_at,
      updated_by_email: mapping.updated_by_email
    }
  })

  return assignments
}
