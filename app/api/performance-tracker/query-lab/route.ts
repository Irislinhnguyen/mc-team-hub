import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildQueryLabSQL, getQueryColumns } from '../../../../lib/services/queryLabBuilder'
import type { QueryLabRequest, QueryLabResponse, ColumnMetadata } from '../../../../lib/types/queryLab'

/**
 * Query Lab API
 *
 * Executes custom queries built from the visual query builder
 * Returns raw data for pivot table display
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: QueryLabRequest = await request.json()
    const { queryConfig, period1, period2, periods } = body

    // Migration logic: Handle both new (periods array) and legacy (period1/period2) formats
    let finalPeriods: any[]

    if (periods && periods.length > 0) {
      // NEW: Use periods array from request
      finalPeriods = periods
    } else if (queryConfig.periods && queryConfig.periods.length > 0) {
      // NEW: Use periods from QueryConfig
      finalPeriods = queryConfig.periods
    } else if (period1 && period2) {
      // LEGACY: Convert period1/period2 to array
      finalPeriods = [period1, period2]
      console.warn('[Query Lab API] Using deprecated period1/period2. Please migrate to periods array.')
    } else if (period1) {
      // LEGACY: Single period
      finalPeriods = [period1]
      console.warn('[Query Lab API] Using deprecated period1. Please migrate to periods array.')
    } else {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Missing time periods. Provide either: periods array, period1/period2, or periods in queryConfig'
        },
        { status: 400 }
      )
    }

    // Validate periods
    if (finalPeriods.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'At least one period is required'
        },
        { status: 400 }
      )
    }

    if (finalPeriods.length > 10) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Maximum 10 periods allowed. You provided ' + finalPeriods.length + ' periods.'
        },
        { status: 400 }
      )
    }

    // Validate entity
    const validEntities = ['pid', 'mid', 'zid', 'team', 'pic', 'product']
    if (!validEntities.includes(queryConfig.entity)) {
      return NextResponse.json(
        {
          status: 'error',
          error: `Invalid entity: ${queryConfig.entity}. Must be one of: ${validEntities.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Special handling for team entity (aggregate from PICs)
    if (queryConfig.entity === 'team') {
      return handleTeamQueryLab(queryConfig, finalPeriods, startTime)
    }

    // Build SQL query with N periods
    const sql = buildQueryLabSQL(queryConfig, finalPeriods)

    console.log(`[Query Lab API] Generated SQL for ${finalPeriods.length} period(s):`, sql)

    // Execute query
    const results = await BigQueryService.executeQuery(sql)

    // Populate team field from PIC-team mappings (for pid/mid/zid entities)
    if (['pid', 'mid', 'zid'].includes(queryConfig.entity)) {
      const { getTeamsWithPics } = await import('../../../../lib/utils/teamMatcher')
      const teamsWithPics = await getTeamsWithPics()

      // Build pic → team mapping
      const picToTeamMap = new Map<string, string>()
      teamsWithPics.forEach(({ team, pics }) => {
        pics.forEach(pic => {
          picToTeamMap.set(pic, team.team_id)
        })
      })

      // Map each row's pic to team
      results.forEach((row: any) => {
        row.team = picToTeamMap.get(row.pic) || 'UNKNOWN'
      })

      console.log(`[Query Lab API] Populated team field for ${results.length} rows`)
    }

    // Get column metadata (pass period count for dynamic columns)
    const columns: ColumnMetadata[] = getQueryColumns(queryConfig.entity, finalPeriods.length).map(col => ({
      name: col.name,
      label: col.label,
      type: col.type as 'string' | 'number' | 'date' | 'boolean',
      category: col.category as 'dimension' | 'metric' | 'calculated',
      isCalculated: col.category === 'calculated'
    }))

    const executionTime = Date.now() - startTime

    const response: QueryLabResponse = {
      data: results,
      columns,
      rowCount: results.length,
      executionTime
    }

    console.log(`[Query Lab API] Query executed successfully: ${results.length} rows in ${executionTime}ms`)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[Query Lab API] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to execute query',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Handle team entity queries
 * Team field doesn't exist in BigQuery - we aggregate from PICs using Supabase mappings
 */
async function handleTeamQueryLab(queryConfig: any, periods: any[], startTime: number) {
  try {
    console.log('[Query Lab API] Handling team entity query')

    // Import team matcher utility
    const { getTeamsWithPics } = await import('../../../../lib/utils/teamMatcher')

    // Get team-PIC mappings from Supabase
    const teamsWithPics = await getTeamsWithPics()
    console.log(`[Query Lab API] Loaded ${teamsWithPics.length} teams from Supabase`)

    // Build PIC query (convert team query to PIC query)
    const picQueryConfig = {
      ...queryConfig,
      entity: 'pic',
      // Keep all conditions and filters
      conditions: queryConfig.conditions || [],
      metricFilters: queryConfig.metricFilters || []
    }

    // Build and execute PIC query
    const sql = buildQueryLabSQL(picQueryConfig, periods)
    console.log('[Query Lab API] Executing PIC query for team aggregation:', sql)

    const picResults = await BigQueryService.executeQuery(sql)
    console.log(`[Query Lab API] Fetched ${picResults.length} PICs from BigQuery`)

    // Aggregate PICs by team
    const teamResults: any[] = []

    for (const { team, pics } of teamsWithPics) {
      // Filter PIC results for this team
      const teamPics = picResults.filter((row: any) => pics.includes(row.pic))

      if (teamPics.length === 0) {
        console.log(`[Query Lab API] No PICs found for team ${team.team_id}`)
        continue
      }

      console.log(`[Query Lab API] Team ${team.team_id}: aggregating ${teamPics.length} PICs`)

      // Build team row
      const teamRow: any = {
        team: team.team_id,
        team_name: team.team_name,
        pic_count: teamPics.length
      }

      // Aggregate metrics for each period
      periods.forEach((_, idx) => {
        const periodNum = idx + 1

        // Sum base metrics
        const rev = teamPics.reduce((sum: number, pic: any) => sum + (pic[`rev_p${periodNum}`] || 0), 0)
        const req = teamPics.reduce((sum: number, pic: any) => sum + (pic[`req_p${periodNum}`] || 0), 0)
        const paid = teamPics.reduce((sum: number, pic: any) => sum + (pic[`paid_p${periodNum}`] || 0), 0)

        teamRow[`rev_p${periodNum}`] = rev
        teamRow[`req_p${periodNum}`] = req
        teamRow[`paid_p${periodNum}`] = paid

        // Calculate derived metrics
        teamRow[`ecpm_p${periodNum}`] = paid > 0 ? (rev / paid) * 1000 : 0
        teamRow[`fill_rate_p${periodNum}`] = req > 0 ? (paid / req) * 100 : 0
      })

      // Calculate change metrics for multi-period queries
      if (periods.length >= 2) {
        for (let i = 1; i < periods.length; i++) {
          const prev = i
          const curr = i + 1

          const revPrev = teamRow[`rev_p${prev}`] || 0
          const revCurr = teamRow[`rev_p${curr}`] || 0
          const reqPrev = teamRow[`req_p${prev}`] || 0
          const reqCurr = teamRow[`req_p${curr}`] || 0
          const ecpmPrev = teamRow[`ecpm_p${prev}`] || 0
          const ecpmCurr = teamRow[`ecpm_p${curr}`] || 0
          const fillPrev = teamRow[`fill_rate_p${prev}`] || 0
          const fillCurr = teamRow[`fill_rate_p${curr}`] || 0

          teamRow[`revenue_change_p${prev}_to_p${curr}`] = revPrev > 0 ? ((revCurr - revPrev) / revPrev) * 100 : 0
          teamRow[`req_change_p${prev}_to_p${curr}`] = reqPrev > 0 ? ((reqCurr - reqPrev) / reqPrev) * 100 : 0
          teamRow[`ecpm_change_p${prev}_to_p${curr}`] = ecpmPrev > 0 ? ((ecpmCurr - ecpmPrev) / ecpmPrev) * 100 : 0
          teamRow[`fill_rate_change_p${prev}_to_p${curr}`] = fillPrev > 0 ? ((fillCurr - fillPrev) / fillPrev) * 100 : 0
        }

        // Legacy 2-period change fields (for backward compatibility)
        if (periods.length === 2) {
          teamRow.revenue_change_pct = teamRow.revenue_change_p1_to_p2
          teamRow.req_change_pct = teamRow.req_change_p1_to_p2
          teamRow.ecpm_change_pct = teamRow.ecpm_change_p1_to_p2
          teamRow.fill_rate_change_pct = teamRow.fill_rate_change_p1_to_p2
        }
      }

      teamResults.push(teamRow)
    }

    // Sort by latest period revenue DESC
    const lastPeriod = periods.length
    teamResults.sort((a, b) => (b[`rev_p${lastPeriod}`] || 0) - (a[`rev_p${lastPeriod}`] || 0))

    // Get column metadata
    const columns: ColumnMetadata[] = getQueryColumns('team', periods.length).map(col => ({
      name: col.name,
      label: col.label,
      type: col.type as 'string' | 'number' | 'date' | 'boolean',
      category: col.category as 'dimension' | 'metric' | 'calculated',
      isCalculated: col.category === 'calculated'
    }))

    const executionTime = Date.now() - startTime

    const response: QueryLabResponse = {
      data: teamResults,
      columns,
      rowCount: teamResults.length,
      executionTime
    }

    console.log(`[Query Lab API] Team query completed: ${teamResults.length} teams in ${executionTime}ms`)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[Query Lab API] Team query error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to execute team query',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 })
}
