/**
 * Quarterly Sheets API
 *
 * GET: List all quarterly sheets
 * POST: Register new quarterly sheet
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * Generate secure webhook token
 */
function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * GET /api/pipelines/quarterly-sheets
 *
 * List all quarterly sheets with pipeline counts
 */
export async function GET() {
  try {
    const { data: sheets, error: sheetsError } = await supabase
      .from('quarterly_sheets')
      .select('*')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })

    if (sheetsError) throw sheetsError

    // Count pipelines for each sheet separately
    const sheetsWithCounts = await Promise.all(
      (sheets || []).map(async (sheet: any) => {
        const { count, error: countError } = await supabase
          .from('pipelines')
          .select('*', { count: 'exact', head: true })
          .eq('quarterly_sheet_id', sheet.id)

        if (countError) {
          console.error(`Error counting pipelines for sheet ${sheet.id}:`, countError)
        }

        return {
          ...sheet,
          pipeline_count: count || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: sheetsWithCounts
    })
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
 * POST /api/pipelines/quarterly-sheets
 *
 * Register new quarterly sheet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { year, quarter, group, sheet_url, sheet_name } = body

    // Validation
    if (!year || !quarter || !group || !sheet_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: year, quarter, group, sheet_url'
        },
        { status: 400 }
      )
    }

    if (quarter < 1 || quarter > 4) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quarter must be between 1 and 4'
        },
        { status: 400 }
      )
    }

    if (!['sales', 'cs'].includes(group)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Group must be "sales" or "cs"'
        },
        { status: 400 }
      )
    }

    // Extract spreadsheet ID from URL
    const spreadsheetId = extractSpreadsheetId(sheet_url)

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Google Sheets URL. Could not extract spreadsheet ID.'
        },
        { status: 400 }
      )
    }

    // Generate webhook token
    const webhookToken = generateWebhookToken()

    // Auto-generate sheet name if not provided
    const finalSheetName =
      sheet_name || `SEA_${group.toUpperCase()}_Q${quarter}_${year}`

    // Insert quarterly sheet
    const { data, error } = await supabase
      .from('quarterly_sheets')
      .insert({
        year,
        quarter,
        group,
        spreadsheet_id: spreadsheetId,
        sheet_name: finalSheetName,
        sheet_url,
        webhook_token: webhookToken,
        sync_status: 'active'
      })
      .select()
      .single()

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          {
            success: false,
            error: `Quarterly sheet already exists for Q${quarter} ${year} (${group})`
          },
          { status: 409 }
        )
      }

      throw error
    }

    console.log(
      `[Quarterly Sheets API] Created: Q${quarter} ${year} (${group}) - ${spreadsheetId}`
    )

    return NextResponse.json({
      success: true,
      data,
      message: `Successfully registered Q${quarter} ${year} ${group} sheet`
    })
  } catch (error: any) {
    console.error('[Quarterly Sheets API] POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
