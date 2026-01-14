/**
 * GET /api/pipelines/pocs
 * Returns all unique POC names from pipelines table
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user using custom JWT
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Get all unique POC names from pipeline_deals table
    const { data, error } = await supabase
      .from('pipeline_deals')
      .select('poc')
      .not('poc', 'is', null)

    if (error) {
      console.error('[Pipelines POCs API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch POCs' },
        { status: 500 }
      )
    }

    // Extract unique POC names and sort
    const uniquePocs = [...new Set(data.map(p => p.poc).filter(Boolean))]
    const sortedPocs = uniquePocs.sort()

    return NextResponse.json({
      data: sortedPocs,
      count: sortedPocs.length
    })
  } catch (error) {
    console.error('[Pipelines POCs API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
