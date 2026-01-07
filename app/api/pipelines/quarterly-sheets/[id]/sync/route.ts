/**
 * Manual Sync Trigger API
 *
 * POST: Manually trigger sync for a quarterly sheet
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncQuarterlySheet } from '@/lib/services/sheetToDatabaseSync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

/**
 * POST /api/pipelines/quarterly-sheets/[id]/sync
 *
 * Manually trigger sync for a quarterly sheet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  try {
    const { id } = params

    // Verify quarterly sheet exists and is active
    const { data: quarterlySheet, error: qsError } = await supabase
      .from('quarterly_sheets')
      .select('*')
      .eq('id', id)
      .single()

    if (qsError || !quarterlySheet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quarterly sheet not found'
        },
        { status: 404 }
      )
    }

    if (quarterlySheet.sync_status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: `Sync is ${quarterlySheet.sync_status} for this quarter`,
          sync_status: quarterlySheet.sync_status
        },
        { status: 423 } // 423 Locked
      )
    }

    console.log(
      `[Manual Sync] Starting sync for Q${quarterlySheet.quarter} ${quarterlySheet.year} (${quarterlySheet.group})...`
    )

    // Execute sync
    const result = await syncQuarterlySheet(id)

    const duration = Date.now() - startTime

    console.log(
      `[Manual Sync] ✅ Complete in ${duration}ms:`,
      `Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}`
    )

    return NextResponse.json({
      success: true,
      result: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        errors: result.errors,
        duration_ms: result.duration_ms
      },
      message: result.errors.length > 0
        ? `Sync completed with ${result.errors.length} errors`
        : 'Sync completed successfully'
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Manual Sync] ❌ Failed after ${duration}ms:`, error.message)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration_ms: duration
      },
      { status: 500 }
    )
  }
}
