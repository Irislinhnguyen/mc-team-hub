/**
 * POST /api/teams/assign - Assign a PIC to a team
 * Body: { picName: string, teamId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { assignPicToTeam, clearTeamConfigCache } from '../../../../lib/utils/teamMatcher'

export async function POST(request: NextRequest) {
  try {
    const { picName, teamId, userEmail } = await request.json()

    if (!picName || !teamId) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required fields: picName and teamId'
        },
        { status: 400 }
      )
    }

    await assignPicToTeam(picName, teamId, userEmail)

    return NextResponse.json({
      status: 'ok',
      message: `Successfully assigned ${picName} to ${teamId}`
    })
  } catch (error) {
    console.error('Error assigning PIC to team:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to assign PIC to team'
      },
      { status: 500 }
    )
  }
}
