/**
 * POST /api/teams/unassign - Remove a PIC from their team
 * Body: { picName: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { removePicFromTeam, clearTeamConfigCache } from '../../../../lib/utils/teamMatcher'

export async function POST(request: NextRequest) {
  try {
    const { picName } = await request.json()

    if (!picName) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required field: picName'
        },
        { status: 400 }
      )
    }

    await removePicFromTeam(picName)

    return NextResponse.json({
      status: 'ok',
      message: `Successfully removed ${picName} from their team`
    })
  } catch (error) {
    console.error('Error removing PIC from team:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to remove PIC from team'
      },
      { status: 500 }
    )
  }
}
