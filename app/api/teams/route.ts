/**
 * GET /api/teams - Get all teams with their assigned PICs
 */

import { NextResponse } from 'next/server'
import { getTeamsWithPics } from '../../../lib/utils/teamMatcher'

export async function GET() {
  try {
    console.log('[API /api/teams] Fetching teams with PICs...')
    const teamsWithPics = await getTeamsWithPics()
    console.log('[API /api/teams] Teams fetched:', teamsWithPics.length, 'teams')
    console.log('[API /api/teams] Data:', JSON.stringify(teamsWithPics, null, 2))

    return NextResponse.json({
      status: 'ok',
      data: teamsWithPics
    })
  } catch (error) {
    console.error('[API /api/teams] ERROR:', error)
    console.error('[API /api/teams] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch teams'
      },
      { status: 500 }
    )
  }
}
