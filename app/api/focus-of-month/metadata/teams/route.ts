/**
 * Focus of the Month - Teams Metadata
 * GET - Fetch teams from team configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { getTeamConfigurations } from '@/lib/utils/teamMatcher'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamConfig = await getTeamConfigurations()

    const teams = teamConfig.teams.map((t: any) => ({
      label: t.team_name,
      value: t.team_id,
    }))

    return NextResponse.json({
      status: 'ok',
      data: teams,
    })
  } catch (error) {
    console.error('[Focus Metadata] Error fetching teams:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}
