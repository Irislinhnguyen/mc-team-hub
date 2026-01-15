/**
 * Individual Quarterly Sheet API
 *
 * GET: Get quarterly sheet details
 * PUT: Update quarterly sheet (e.g., pause/resume sync)
 * DELETE: Delete quarterly sheet and all associated pipelines
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
 * GET /api/pipelines/quarterly-sheets/[id]
 *
 * Get quarterly sheet details for linking to Google Sheets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data, error } = await supabase
      .from('quarterly_sheets')
      .select('id, spreadsheet_id, sheet_name, sheet_url, fiscal_year, fiscal_quarter, group')
      .eq('id', id)
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

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Quarterly Sheets API] GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

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

/**
 * DELETE /api/pipelines/quarterly-sheets/[id]
 *
 * Delete quarterly sheet and all associated pipelines
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // First, delete all pipelines associated with this sheet
    const { error: pipelinesDeleteError } = await supabase
      .from('pipelines')
      .delete()
      .eq('quarterly_sheet_id', id)

    if (pipelinesDeleteError) {
      console.error('[Quarterly Sheets API] Failed to delete pipelines:', pipelinesDeleteError)
      // Continue anyway - try to delete the sheet
    }

    // Delete the quarterly sheet
    const { error: sheetDeleteError } = await supabase
      .from('quarterly_sheets')
      .delete()
      .eq('id', id)

    if (sheetDeleteError) {
      if (sheetDeleteError.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Quarterly sheet not found'
          },
          { status: 404 }
        )
      }

      throw sheetDeleteError
    }

    console.log(`[Quarterly Sheets API] Deleted ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Quarterly sheet deleted successfully'
    })
  } catch (error: any) {
    console.error('[Quarterly Sheets API] DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
