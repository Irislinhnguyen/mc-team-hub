import { NextResponse } from 'next/server'
import { getTeamConfigurations } from '../../../../lib/utils/teamMatcher'

/**
 * GET /api/teams/configurations
 * Returns team configurations and PIC mappings for client-side use
 */
export async function GET() {
  try {
    const config = await getTeamConfigurations()

    return NextResponse.json({
      teams: config.teams,
      picMappings: config.picMappings,
      productPatterns: config.productPatterns
    })
  } catch (error: any) {
    console.error('[API] Error fetching team configurations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team configurations', details: error.message },
      { status: 500 }
    )
  }
}
