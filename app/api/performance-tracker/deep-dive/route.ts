import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildWhereClause } from '../../../../lib/services/analyticsQueries'
import {
  getPerspectiveConfig,
  type PerspectiveType
} from '../../../../lib/config/perspectiveConfigs'
import {
  buildDeepDiveQuery,
  type Period
} from '../../../../lib/services/deepDiveQueryBuilder'
import type { SimplifiedFilter } from '../../../../lib/types/performanceTracker'

/**
 * Unified Deep Dive API v2
 *
 * Single endpoint that handles all 6 perspectives:
 * - team: Team performance analysis
 * - pic: PIC (Person in Charge) portfolio analysis
 * - pid: Publisher performance analysis
 * - mid: Media property analysis
 * - product: Product performance analysis
 * - zone: Zone-level analysis
 *
 * Features:
 * - Unified tier classification (Hero/Solid/Underperformer/Remove)
 * - Enhanced New/Lost tracking with tier context
 * - Transition warnings (At Risk / Rising Star)
 * - Drill-down support with tier filtering
 */

interface DeepDiveRequest {
  /** Which perspective to analyze */
  perspective: PerspectiveType

  /** First comparison period */
  period1: Period

  /** Second comparison period */
  period2: Period

  /** Filter criteria */
  filters: Record<string, any>

  /** Simplified filter criteria (Looker Studio-style) */
  simplifiedFilter?: SimplifiedFilter

  /** Parent entity ID for drill-down (optional) */
  parentId?: string | number

  /** Filter by specific tier for drill-down (optional) */
  tierFilter?: 'hero' | 'solid' | 'underperformer' | 'remove' | 'new' | 'lost'
}

interface DeepDiveResponse {
  status: 'ok' | 'error'
  data?: any[]
  summary?: {
    total_items: number
    total_revenue_p1: number
    total_revenue_p2: number
    revenue_change_pct: number
    total_requests_p1: number
    total_requests_p2: number
    requests_change_pct: number
    total_ecpm_p1: number
    total_ecpm_p2: number
    ecpm_change_pct: number
    tier_counts: Record<string, number>
    tier_revenue: Record<string, number>
    tier_distribution?: Record<string, number>
  }
  error?: string
  context?: {
    perspective: PerspectiveType
    period1: Period
    period2: Period
    parentId?: string | number
    tierFilter?: string
  }
}

/**
 * Enhance items with transition warnings and tier context
 */
function enhanceItems(items: any[]): any[] {
  return items.map(item => {
    const enhanced: any = { ...item }

    // Determine the tier to use (either 'tier' from BigQuery or 'revenue_tier' from manual calculation)
    const tier = item.tier || item.revenue_tier

    // Enhanced tier status for New/Lost items
    if (item.status === 'new') {
      // For new items, determine which tier they'd be in based on P2 revenue
      enhanced.tier_group = `new_${tier}` // e.g., "new_A", "new_B", "new_C"
      enhanced.display_tier = 'NEW'
      enhanced.tier = tier
    } else if (item.status === 'lost') {
      // For lost items, show which tier they WERE in based on P1 revenue
      enhanced.tier_group = `lost_${tier}` // e.g., "lost_A", "lost_B", "lost_C"
      enhanced.display_tier = 'LOST'
      enhanced.tier = tier
      // Use 6-month monthly average if available, otherwise fall back to rev_p1
      enhanced.lost_revenue = item.avg_monthly_revenue || item.rev_p1
      enhanced.months_with_data = item.months_with_data || 0
    } else {
      // Existing items: use simple A/B/C tier
      enhanced.tier = tier
      enhanced.tier_group = tier // 'A', 'B', or 'C'
      enhanced.display_tier = tier
    }

    // Generate actionable warnings for all items (will skip new/lost internally)
    const warnings = generateActionableWarnings(item)
    enhanced.warning_severity = warnings.severity
    enhanced.warning_message = warnings.message
    enhanced.warning_metrics = warnings.metrics

    return enhanced
  })
}

/**
 * Generate actionable warnings based on metric analysis
 * Uses ad tech industry standards for thresholds
 */
function generateActionableWarnings(item: any): {
  severity: 'healthy' | 'info' | 'warning' | 'critical'
  message: string | null
  metrics: string[]
} {
  const {
    req_p1,
    req_p2,
    rev_p1,
    rev_p2,
    paid_p1,
    paid_p2,
    status
  } = item

  // Skip warnings for new or lost items
  if (status === 'new' || status === 'lost') {
    return {
      severity: 'healthy',
      message: null,
      metrics: []
    }
  }

  // Calculate change percentages
  const req_change_pct = req_p1 > 0 ? ((req_p2 - req_p1) / req_p1) * 100 : 0
  const rev_change_pct = rev_p1 > 0 ? ((rev_p2 - rev_p1) / rev_p1) * 100 : 0

  // Calculate eCPM for both periods
  const ecpm_p1 = req_p1 > 0 ? (rev_p1 / req_p1) * 1000 : 0
  const ecpm_p2 = req_p2 > 0 ? (rev_p2 / req_p2) * 1000 : 0
  const ecpm_change_pct = ecpm_p1 > 0 ? ((ecpm_p2 - ecpm_p1) / ecpm_p1) * 100 : 0

  // Calculate fill rate
  const fill_rate_p1 = req_p1 > 0 ? (paid_p1 / req_p1) * 100 : 0
  const fill_rate_p2 = req_p2 > 0 ? (paid_p2 / req_p2) * 100 : 0
  const fill_rate_change = fill_rate_p2 - fill_rate_p1

  // Store warnings with priority (highest priority first)
  const warnings: Array<{
    severity: 'info' | 'warning' | 'critical'
    message: string
    metrics: string[]
    priority: number
  }> = []

  // CRITICAL ALERTS (Priority 1)

  // Request volume crashed (>40% drop)
  if (req_change_pct <= -40) {
    warnings.push({
      severity: 'critical',
      message: `Request volume dropped ${Math.abs(req_change_pct).toFixed(1)}% - Contact publisher immediately to check integration`,
      metrics: ['requests'],
      priority: 1
    })
  }

  // eCPM severely dropped (>40% drop or below critical threshold)
  if (ecpm_change_pct <= -40) {
    warnings.push({
      severity: 'critical',
      message: `eCPM dropped ${Math.abs(ecpm_change_pct).toFixed(1)}% - Urgent floor price review or demand partner check needed`,
      metrics: ['ecpm'],
      priority: 1
    })
  }

  // Combined critical: Both requests and eCPM significantly down
  if (req_change_pct <= -25 && ecpm_change_pct <= -25) {
    warnings.push({
      severity: 'critical',
      message: `Revenue crisis: Requests down ${Math.abs(req_change_pct).toFixed(1)}%, eCPM down ${Math.abs(ecpm_change_pct).toFixed(1)}% - Immediate investigation required`,
      metrics: ['requests', 'ecpm', 'revenue'],
      priority: 1
    })
  }

  // Fill rate critically low
  if (fill_rate_p2 < 50 && fill_rate_change <= -15) {
    warnings.push({
      severity: 'critical',
      message: `Fill rate critically low at ${fill_rate_p2.toFixed(1)}% - Check demand partner health immediately`,
      metrics: ['fill_rate'],
      priority: 1
    })
  }

  // WARNING ALERTS (Priority 2)

  // Request volume warning (25-40% drop)
  if (req_change_pct > -40 && req_change_pct <= -25) {
    warnings.push({
      severity: 'warning',
      message: `Traffic dropped ${Math.abs(req_change_pct).toFixed(1)}% - Verify publisher ad tag implementation`,
      metrics: ['requests'],
      priority: 2
    })
  }

  // eCPM warning (25-40% drop)
  if (ecpm_change_pct > -40 && ecpm_change_pct <= -25) {
    warnings.push({
      severity: 'warning',
      message: `eCPM declining ${Math.abs(ecpm_change_pct).toFixed(1)}% - Consider floor price optimization`,
      metrics: ['ecpm'],
      priority: 2
    })
  }

  // Revenue down but different root causes
  if (rev_change_pct <= -25 && rev_change_pct > -40) {
    if (req_change_pct <= -15 && ecpm_change_pct > -10) {
      warnings.push({
        severity: 'warning',
        message: `Revenue down ${Math.abs(rev_change_pct).toFixed(1)}% due to traffic drop - Contact publisher about ad inventory`,
        metrics: ['revenue', 'requests'],
        priority: 2
      })
    } else if (ecpm_change_pct <= -15 && req_change_pct > -10) {
      warnings.push({
        severity: 'warning',
        message: `Revenue down ${Math.abs(rev_change_pct).toFixed(1)}% due to eCPM decline - Review pricing strategy`,
        metrics: ['revenue', 'ecpm'],
        priority: 2
      })
    }
  }

  // Fill rate warning
  if (fill_rate_change <= -15 && fill_rate_change > -30 && fill_rate_p2 >= 50) {
    warnings.push({
      severity: 'warning',
      message: `Fill rate dropped ${Math.abs(fill_rate_change).toFixed(1)}pp - Monitor demand partner performance`,
      metrics: ['fill_rate'],
      priority: 2
    })
  }

  // INFO ALERTS (Priority 3)

  // Request volume info (15-25% drop)
  if (req_change_pct > -25 && req_change_pct <= -15) {
    warnings.push({
      severity: 'info',
      message: `Requests declining ${Math.abs(req_change_pct).toFixed(1)}% - Monitor for continued trend`,
      metrics: ['requests'],
      priority: 3
    })
  }

  // eCPM info (15-25% drop)
  if (ecpm_change_pct > -25 && ecpm_change_pct <= -15) {
    warnings.push({
      severity: 'info',
      message: `eCPM slightly down ${Math.abs(ecpm_change_pct).toFixed(1)}% - Within normal market fluctuation range`,
      metrics: ['ecpm'],
      priority: 3
    })
  }

  // Fill rate info
  if (fill_rate_change <= -10 && fill_rate_change > -15) {
    warnings.push({
      severity: 'info',
      message: `Fill rate decreased ${Math.abs(fill_rate_change).toFixed(1)}pp - Continue monitoring`,
      metrics: ['fill_rate'],
      priority: 3
    })
  }

  // Return highest priority warning (or healthy if no warnings)
  if (warnings.length === 0) {
    return {
      severity: 'healthy',
      message: null,
      metrics: []
    }
  }

  // Sort by priority and return the most critical warning
  warnings.sort((a, b) => a.priority - b.priority)
  const topWarning = warnings[0]

  return {
    severity: topWarning.severity,
    message: topWarning.message,
    metrics: topWarning.metrics
  }
}

/**
 * Calculate summary statistics with A/B/C grouping
 */
function calculateSummary(items: any[]) {
  const total_items = items.length
  const total_revenue_p1 = items.reduce((sum, item) => sum + (item.rev_p1 || 0), 0)
  const total_revenue_p2 = items.reduce((sum, item) => sum + (item.rev_p2 || 0), 0)
  const revenue_change_pct = total_revenue_p1 > 0
    ? ((total_revenue_p2 - total_revenue_p1) / total_revenue_p1) * 100
    : 0

  // Calculate total requests
  const total_requests_p1 = items.reduce((sum, item) => sum + (item.req_p1 || 0), 0)
  const total_requests_p2 = items.reduce((sum, item) => sum + (item.req_p2 || 0), 0)
  const requests_change_pct = total_requests_p1 > 0
    ? ((total_requests_p2 - total_requests_p1) / total_requests_p1) * 100
    : 0

  // Calculate eCPM (Revenue / Requests * 1000)
  const total_ecpm_p1 = total_requests_p1 > 0 ? (total_revenue_p1 / total_requests_p1) * 1000 : 0
  const total_ecpm_p2 = total_requests_p2 > 0 ? (total_revenue_p2 / total_requests_p2) * 1000 : 0
  const ecpm_change_pct = total_ecpm_p1 > 0
    ? ((total_ecpm_p2 - total_ecpm_p1) / total_ecpm_p1) * 100
    : 0

  // Count by display tier (A, B, C, NEW, LOST)
  const tier_counts: Record<string, number> = {
    A: 0,
    B: 0,
    C: 0,
    NEW: 0,
    LOST: 0
  }

  items.forEach(item => {
    const displayTier = item.display_tier || item.tier || 'unknown'
    if (displayTier in tier_counts) {
      tier_counts[displayTier]++
    }
  })

  // Calculate revenue by tier
  const tier_revenue: Record<string, number> = {
    A: 0,
    B: 0,
    C: 0,
    NEW: 0,
    LOST: 0
  }

  items.forEach(item => {
    const displayTier = item.display_tier || item.tier || 'unknown'
    if (displayTier in tier_revenue) {
      tier_revenue[displayTier] += item.rev_p2 || 0
    }
  })

  return {
    total_items,
    total_revenue_p1,
    total_revenue_p2,
    revenue_change_pct,
    total_requests_p1,
    total_requests_p2,
    requests_change_pct,
    total_ecpm_p1,
    total_ecpm_p2,
    ecpm_change_pct,
    tier_counts,
    tier_revenue
  }
}

/**
 * Handle Team Perspective by aggregating PICs into teams
 * Since BigQuery table doesn't have team column, we:
 * 1. Fetch PIC perspective data
 * 2. Get team mappings from Supabase
 * 3. Group PICs by team and aggregate metrics
 */
async function handleTeamPerspective(
  period1: Period,
  period2: Period,
  filters: Record<string, any>,
  tierFilter?: string
): Promise<NextResponse<DeepDiveResponse>> {
  try {
    const { getTeamsWithPics } = await import('../../../../lib/utils/teamMatcher')

    // Get team mappings from Supabase
    const teamsWithPics = await getTeamsWithPics()

    // Filter teams if team filter is provided
    let filteredTeams = teamsWithPics
    if (filters.team && Array.isArray(filters.team) && filters.team.length > 0) {
      filteredTeams = teamsWithPics.filter(({ team }) =>
        filters.team.includes(team.team_id)
      )
      console.log(`[Team Perspective] Filtered to ${filteredTeams.length} teams:`, filters.team)
    } else if (filters.team && typeof filters.team === 'string') {
      // Handle single team as string
      filteredTeams = teamsWithPics.filter(({ team }) =>
        team.team_id === filters.team
      )
      console.log(`[Team Perspective] Filtered to team: ${filters.team}`)
    }

    // Fetch PIC perspective data (all PICs)
    const picConfig = getPerspectiveConfig('pic')
    if (!picConfig) {
      throw new Error('PIC perspective config not found')
    }

    // Build WHERE clause from filters (excluding team filter to avoid double-filtering)
    const additionalFilters = { ...filters }
    delete additionalFilters.startDate
    delete additionalFilters.endDate
    delete additionalFilters.team  // Remove team filter - will be applied manually later

    const additionalWhereClause = await buildWhereClause(additionalFilters, {
      skipDateFilter: true,
      skipRevFlagFilter: true
    })

    const additionalCondition = additionalWhereClause.replace(/^WHERE\s+/, '')

    // Build query for PIC perspective
    const query = buildDeepDiveQuery(
      picConfig,
      {
        period1,
        period2,
        additionalCondition: additionalCondition || undefined
      },
      tierFilter
    )

    // Execute query to get all PICs
    const picResults = await BigQueryService.executeQuery(query)

    console.log(`[Team Perspective] Fetched ${picResults.length} PICs from BigQuery`)

    // Group PICs by team and aggregate
    const teamData: any[] = []

    for (const { team, pics } of filteredTeams) {
      // Filter PIC results for this team (pic.pic contains the PIC name)
      const teamPics = picResults.filter((pic: any) =>
        pics.includes(pic.pic)
      )

      if (teamPics.length === 0) {
        console.log(`[Team Perspective] No PICs found for team ${team.team_id}, expected PICs:`, pics)
        continue
      }

      console.log(`[Team Perspective] Team ${team.team_id}: found ${teamPics.length} PICs`)

      // Aggregate metrics for this team
      const team_rev_p1 = teamPics.reduce((sum: number, pic: any) => sum + (pic.rev_p1 || 0), 0)
      const team_rev_p2 = teamPics.reduce((sum: number, pic: any) => sum + (pic.rev_p2 || 0), 0)
      const team_req_p1 = teamPics.reduce((sum: number, pic: any) => sum + (pic.req_p1 || 0), 0)
      const team_req_p2 = teamPics.reduce((sum: number, pic: any) => sum + (pic.req_p2 || 0), 0)
      const team_paid_p1 = teamPics.reduce((sum: number, pic: any) => sum + (pic.paid_p1 || 0), 0)
      const team_paid_p2 = teamPics.reduce((sum: number, pic: any) => sum + (pic.paid_p2 || 0), 0)

      teamData.push({
        id: team.team_id,
        name: team.team_name,
        pic_count: teamPics.length,
        rev_p1: team_rev_p1,
        rev_p2: team_rev_p2,
        req_p1: team_req_p1,
        req_p2: team_req_p2,
        paid_p1: team_paid_p1,
        paid_p2: team_paid_p2,
        fill_rate_p1: team_req_p1 > 0 ? (team_paid_p1 / team_req_p1) * 100 : 0,
        fill_rate_p2: team_req_p2 > 0 ? (team_paid_p2 / team_req_p2) * 100 : 0,
        rev_change_pct: team_rev_p1 > 0 ? ((team_rev_p2 - team_rev_p1) / team_rev_p1) * 100 : 0,
        status: team_rev_p1 === 0 && team_rev_p2 > 0 ? 'new'
              : team_rev_p1 > 0 && team_rev_p2 === 0 ? 'lost'
              : 'existing'
      })
    }

    // Sort by P2 revenue DESC
    teamData.sort((a, b) => b.rev_p2 - a.rev_p2)

    // Calculate cumulative revenue and assign tiers
    const totalRevenue = teamData.reduce((sum, team) => sum + team.rev_p2, 0)
    let cumulative = 0

    teamData.forEach(team => {
      cumulative += team.rev_p2
      team.cumulative_revenue = cumulative
      team.cumulative_revenue_pct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0

      // Assign revenue tier based on cumulative %
      if (team.cumulative_revenue_pct <= 80) {
        team.revenue_tier = 'A'
      } else if (team.cumulative_revenue_pct <= 95) {
        team.revenue_tier = 'B'
      } else {
        team.revenue_tier = 'C'
      }
    })

    console.log(`[Team Perspective] Team data before enhance:`, teamData.map(t => ({
      id: t.id,
      name: t.name,
      revenue_tier: t.revenue_tier,
      status: t.status
    })))

    // Enhance results with tier groups and warnings
    const enhancedResults = enhanceItems(teamData)

    console.log(`[Team Perspective] Team data after enhance:`, enhancedResults.map(t => ({
      id: t.id,
      name: t.name,
      tier: t.tier,
      display_tier: t.display_tier,
      tier_group: t.tier_group
    })))

    // Calculate summary
    const summary = calculateSummary(enhancedResults)

    return NextResponse.json({
      status: 'ok',
      data: enhancedResults,
      summary,
      context: {
        perspective: 'team',
        period1,
        period2,
        tierFilter
      }
    })

  } catch (error: any) {
    console.error('[Team Perspective] Error:', error)
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Failed to fetch team perspective data'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<DeepDiveResponse>> {
  try {
    const body: DeepDiveRequest = await request.json()
    const { perspective, period1, period2, filters, simplifiedFilter, parentId, tierFilter } = body

    // Special handling for Team perspective (aggregate PICs into teams)
    if (perspective === 'team') {
      return handleTeamPerspective(period1, period2, filters, tierFilter)
    }

    // Validate perspective
    const config = getPerspectiveConfig(perspective)
    if (!config) {
      return NextResponse.json({
        status: 'error',
        error: `Invalid perspective: ${perspective}`
      }, { status: 400 })
    }

    // Build WHERE clause from filters
    const additionalFilters = { ...filters }
    delete additionalFilters.startDate
    delete additionalFilters.endDate

    console.log(`[${perspective} Perspective] Filters before buildWhereClause:`, additionalFilters)
    console.log(`[${perspective} Perspective] Simplified filter:`, simplifiedFilter)

    const additionalWhereClause = await buildWhereClause(additionalFilters, {
      skipDateFilter: true,
      skipRevFlagFilter: true,
      simplifiedFilter
    })

    const additionalCondition = additionalWhereClause.replace(/^WHERE\s+/, '')

    console.log(`[${perspective} Perspective] Additional WHERE condition:`, additionalCondition)

    // Build query
    const query = buildDeepDiveQuery(
      config,
      {
        period1,
        period2,
        parentId,
        additionalCondition: additionalCondition || undefined
      },
      tierFilter
    )

    console.log(`[${perspective} Perspective] Final query length:`, query.length, 'chars')
    console.log(`[${perspective} Perspective] Query preview:`, query.substring(0, 500) + '...')

    // Execute query
    const results = await BigQueryService.executeQuery(query)

    console.log(`[${perspective} Perspective] Results count:`, results.length)

    // Enhance results with transition warnings and tier context
    const enhancedResults = enhanceItems(results)

    // Calculate summary
    const summary = calculateSummary(enhancedResults)

    return NextResponse.json({
      status: 'ok',
      data: enhancedResults,
      summary,
      context: {
        perspective,
        period1,
        period2,
        parentId,
        tierFilter
      }
    })

  } catch (error: any) {
    console.error('[Deep Dive v2 API] Error:', error)

    return NextResponse.json({
      status: 'error',
      error: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}
