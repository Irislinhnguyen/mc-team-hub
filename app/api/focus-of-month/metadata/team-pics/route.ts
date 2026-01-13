/**
 * Focus of the Month - Team to PICs Mapping
 * GET - Get PICs for a specific team from Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { getTeamConfigurations } from '@/lib/utils/teamMatcher'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team')

    if (!teamId) {
      return NextResponse.json(
        { status: 'error', message: 'Team ID is required' },
        { status: 400 }
      )
    }

    // Get team configurations to find PIC mappings
    const teamConfig = await getTeamConfigurations()

    // Find PICs for this team
    const picMappings = teamConfig.picMappings || []
    const picsForTeam = picMappings
      .filter((m: any) => m.team_id === teamId)
      .map((m: any) => m.pic_name)

    return NextResponse.json({
      status: 'ok',
      data: picsForTeam,
    })
  } catch (error) {
    console.error('[Focus Metadata] Error fetching team PICs:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch team PICs' },
      { status: 500 }
    )
  }
}
