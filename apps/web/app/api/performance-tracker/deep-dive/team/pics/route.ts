import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../../lib/services/bigquery'
import { getTeamsWithPics } from '../../../../../../lib/utils/teamMatcher'
import { buildDeepDiveQuery, type Period } from '../../../../../../lib/services/deepDiveQueryBuilder'
import { getPerspectiveConfig } from '../../../../../../lib/config/perspectiveConfigs'

/**
 * Team → PICs Drill-down
 * Get all PICs belonging to a specific team
 */

interface TeamPICsRequest {
  team: string
  period1: Period
  period2: Period
  filters: Record<string, any>
  tier?: string
}

export async function POST(request: NextRequest) {
  try {
    const { team, period1, period2, filters, tier }: TeamPICsRequest = await request.json()

    // Get team mappings to find PICs for this team
    const teamsWithPics = await getTeamsWithPics()
    const teamData = teamsWithPics.find(t => t.team.team_id === team)

    if (!teamData) {
      return NextResponse.json({
        status: 'error',
        message: `Team not found: ${team}`
      }, { status: 404 })
    }

    // Get PIC perspective data
    const picConfig = getPerspectiveConfig('pic')
    const query = buildDeepDiveQuery(picConfig, {
      period1,
      period2,
      filters,
      tierFilter: tier
    })

    const allPics = await BigQueryService.executeQuery(query)

    // Filter to only PICs belonging to this team
    const teamPics = allPics.filter(pic => teamData.pics.includes(pic.pic))

    // Calculate summary
    const summary = {
      total_items: teamPics.length,
      total_revenue_p1: teamPics.reduce((sum, p) => sum + (p.rev_p1 || 0), 0),
      total_revenue_p2: teamPics.reduce((sum, p) => sum + (p.rev_p2 || 0), 0),
      revenue_change_pct: 0,
      tier_distribution: {} as Record<string, number>
    }

    if (summary.total_revenue_p1 > 0) {
      summary.revenue_change_pct = ((summary.total_revenue_p2 - summary.total_revenue_p1) / summary.total_revenue_p1) * 100
    }

    return NextResponse.json({
      status: 'ok',
      data: teamPics,
      summary,
      context: { team, tier }
    })

  } catch (error) {
    console.error('Team PICs API Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
