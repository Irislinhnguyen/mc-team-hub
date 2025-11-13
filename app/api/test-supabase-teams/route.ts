import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase credentials',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('team_configurations')
      .select('*')
      .order('team_id')

    if (teamsError) {
      throw new Error(`Error fetching teams: ${teamsError.message}`)
    }

    // 2. Get all team-PIC mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('team_pic_mappings')
      .select('*')
      .order('team_id')

    if (mappingsError) {
      throw new Error(`Error fetching mappings: ${mappingsError.message}`)
    }

    // 3. Check specifically for team "APP" (uppercase)
    const appTeam = teams?.find(t => t.team_id === 'APP')
    const appMappings = mappings?.filter(m => m.team_id === 'APP')

    return NextResponse.json({
      status: 'ok',
      totalTeams: teams?.length || 0,
      totalMappings: mappings?.length || 0,
      teams: teams || [],
      mappings: mappings || [],
      appTeam: {
        exists: !!appTeam,
        data: appTeam,
        picCount: appMappings?.length || 0,
        pics: appMappings?.map(m => m.pic_name) || []
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 })
  }
}
