/**
 * Webhook Endpoint for Google Sheets Changes
 *
 * Receives notifications from Google Apps Script when quarterly sheets are edited
 * Triggers async sync process to update database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncQuarterlySheet } from '@/lib/services/sheetToDatabaseSync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

interface WebhookPayload {
  token: string
  spreadsheet_id: string
  sheet_name: string
  trigger_type: 'edit' | 'change' | 'manual'
  timestamp?: string
  row_count?: number
  user_email?: string
  changed_rows?: number[]  // ← NEW: Array of row numbers that changed
}

// Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

/**
 * Authenticate webhook token
 */
async function authenticateWebhookToken(token: string) {
  const { data, error } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .eq('webhook_token', token)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Process sync asynchronously
 */
async function processSyncAsync(quarterlySheetId: string, changedRows?: number[]) {
  const startTime = Date.now()

  try {
    console.log(`[Webhook] Starting sync for sheet ${quarterlySheetId}`)
    if (changedRows && changedRows.length > 0) {
      console.log(`[Webhook] 🎯 Incremental sync: ${changedRows.length} changed rows: ${changedRows.join(', ')}`)
    }

    const result = await syncQuarterlySheet(quarterlySheetId, changedRows)

    const duration = Date.now() - startTime

    console.log(
      `[Webhook] ✅ Sync complete in ${duration}ms:`,
      `Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}`
    )

    if (result.errors.length > 0) {
      console.warn(`[Webhook] Sync completed with ${result.errors.length} errors:`)
      result.errors.forEach((err) => console.warn(`  - ${err}`))
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Webhook] ❌ Sync failed after ${duration}ms:`, error.message)
  }
}

/**
 * POST /api/pipelines/webhook/sheet-changed
 *
 * Webhook handler for Google Apps Script triggers
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Step 1: Parse and validate payload
    const payload: WebhookPayload = await request.json()

    if (!payload.token || !payload.spreadsheet_id) {
      console.warn('[Webhook] Missing required fields in payload')
      return NextResponse.json(
        { error: 'Missing required fields: token, spreadsheet_id' },
        { status: 400 }
      )
    }

    // Step 2: Authenticate webhook token
    const quarterlySheet = await authenticateWebhookToken(payload.token)

    if (!quarterlySheet) {
      console.warn('[Webhook] Invalid token:', payload.token.substring(0, 10) + '...')
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 })
    }

    // Step 3: Verify spreadsheet ID matches
    if (quarterlySheet.spreadsheet_id !== payload.spreadsheet_id) {
      console.error(
        '[Webhook] Spreadsheet ID mismatch:',
        `Expected ${quarterlySheet.spreadsheet_id}, got ${payload.spreadsheet_id}`
      )
      return NextResponse.json(
        { error: 'Spreadsheet ID mismatch' },
        { status: 403 }
      )
    }

    // Step 4: Check if sync is active
    if (quarterlySheet.sync_status !== 'active') {
      console.warn(
        '[Webhook] Sync is paused for quarter:',
        `Q${quarterlySheet.quarter} ${quarterlySheet.year} (${quarterlySheet.group})`
      )
      return NextResponse.json(
        {
          error: 'Sync is paused for this quarter',
          quarter: `Q${quarterlySheet.quarter} ${quarterlySheet.year}`,
          status: quarterlySheet.sync_status
        },
        { status: 423 } // 423 Locked
      )
    }

    console.log(
      `[Webhook] Accepted sync request for Q${quarterlySheet.quarter} ${quarterlySheet.year} (${quarterlySheet.group})`
    )

    // Step 5: Return 200 immediately, process async
    // This prevents Google Apps Script timeout
    const response = NextResponse.json({
      status: 'accepted',
      message: 'Sync queued for processing',
      quarter: `Q${quarterlySheet.quarter} ${quarterlySheet.year}`,
      group: quarterlySheet.group
    })

    // Process sync in background (non-blocking)
    processSyncAsync(quarterlySheet.id, payload.changed_rows).catch((error) => {
      console.error('[Webhook] Async processing error:', error)
    })

    return response
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Webhook] Error after ${duration}ms:`, error.message)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pipelines/webhook/sheet-changed
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}
