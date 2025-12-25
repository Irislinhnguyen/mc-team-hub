/**
 * GET /api/pipelines/metadata
 * Returns team options, POC names, and Pipeline POC-to-team mapping for client-side filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/api-auth'
import { getTeamConfigurations, getPipelinePocToTeamMap } from '@/lib/utils/teamMatcher'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Authenticate user using custom JWT
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Fetch team configurations and Pipeline POC mappings
    const config = await getTeamConfigurations()
    const pipelinePocToTeamMap = await getPipelinePocToTeamMap()

    // Fetch unique POC names from pipelines table
    const { data: pocData, error: pocError } = await supabase
      .from('pipelines')
      .select('poc')
      .not('poc', 'is', null)

    if (pocError) {
      console.error('[Pipelines Metadata API] Error fetching POCs:', pocError)
      throw pocError
    }

    // Get unique POC names and sort alphabetically
    const uniquePOCs = [...new Set(pocData.map(p => p.poc))].sort()

    // Convert Map to plain object for JSON
    const pocTeamMapping = Object.fromEntries(pipelinePocToTeamMap)

    return NextResponse.json({
      teams: config.teams.map(t => ({
        team_id: t.team_id,
        team_name: t.team_name,
        description: t.description
      })),
      pocNames: uniquePOCs,
      pocTeamMapping
    })
  } catch (error) {
    console.error('[Pipelines Metadata API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    )
  }
}
