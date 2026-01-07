/**
 * Individual Quarterly Sheet API
 *
 * PUT: Update quarterly sheet (e.g., pause/resume sync)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

/**
 * PUT /api/pipelines/quarterly-sheets/[id]
 *
 * Update quarterly sheet status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const { sync_status } = body

    // Validation
    if (!sync_status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: sync_status'
        },
        { status: 400 }
      )
    }

    if (!['active', 'paused', 'archived'].includes(sync_status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'sync_status must be "active", "paused", or "archived"'
        },
        { status: 400 }
      )
    }

    // Update quarterly sheet
    const { data, error } = await supabase
      .from('quarterly_sheets')
      .update({
        sync_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Quarterly sheet not found'
          },
          { status: 404 }
        )
      }

      throw error
    }

    console.log(
      `[Quarterly Sheets API] Updated ${id}: sync_status = ${sync_status}`
    )

    return NextResponse.json({
      success: true,
      data,
      message: `Sync ${sync_status === 'active' ? 'enabled' : sync_status === 'paused' ? 'paused' : 'archived'}`
    })
  } catch (error: any) {
    console.error('[Quarterly Sheets API] PUT error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
