/**
 * Debug API Endpoint for Row Inspection
 *
 * Allows inspection of individual rows from Google Sheets to debug sync issues.
 * Usage: GET /api/debug/inspect-row?sheet_id=...&row=146&group=sales
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSheetsClient } from '@/lib/services/googleSheetsClient'
import { transformRowToPipeline } from '@/lib/services/sheetTransformers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface InspectResult {
  rowNumber: number
  rowLength: number
  group: string
  rawValues: any[]
  transformed: any | null
  error: string | null
  validation: {
    valid: boolean
    error?: string
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sheetId = searchParams.get('sheet_id')
  const rowNumber = parseInt(searchParams.get('row') || '0')
  const group = (searchParams.get('group') || 'sales') as 'sales' | 'cs'

  if (!sheetId) {
    return NextResponse.json(
      { error: 'Missing sheet_id parameter' },
      { status: 400 }
    )
  }

  if (!rowNumber || rowNumber < 1) {
    return NextResponse.json(
      { error: 'Invalid row parameter. Must be >= 1' },
      { status: 400 }
    )
  }

  if (group !== 'sales' && group !== 'cs') {
    return NextResponse.json(
      { error: 'Invalid group parameter. Must be "sales" or "cs"' },
      { status: 400 }
    )
  }

  try {
    console.log(`[Debug] Inspecting row ${rowNumber} from sheet ${sheetId} (group: ${group})`)

    // Get Google Sheets client
    const sheets = await getSheetsClient()

    // Fetch the specific row (columns A to CZ, which is 1-104)
    const range = `Sheet1!A${rowNumber}:CZ${rowNumber}`
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range
    })

    const row = response.data.values?.[0]
    if (!row) {
      return NextResponse.json(
        {
          error: `Row ${rowNumber} not found or empty`,
          sheetId,
          rowNumber,
          hint: 'Check if the row number is correct and the sheet has data'
        },
        { status: 404 }
      )
    }

    // Attempt transformation
    let pipeline = null
    let transformError = null

    try {
      pipeline = transformRowToPipeline(row, 'debug-user', group, 2025)
    } catch (e: any) {
      transformError = e.message
      console.error(`[Debug] Transformation failed:`, e.message)
    }

    // Prepare result
    const result: InspectResult = {
      rowNumber,
      rowLength: row.length,
      group,
      rawValues: row.slice(0, 30), // First 30 columns for readability
      transformed: pipeline,
      error: transformError,
      validation: {
        valid: row.length >= (group === 'sales' ? 95 : 94),
        error: row.length < (group === 'sales' ? 95 : 94)
          ? `Row has only ${row.length} columns, expected at least ${group === 'sales' ? 95 : 94}`
          : undefined
      }
    }

    return NextResponse.json(result)
  } catch (e: any) {
    console.error(`[Debug] Error inspecting row:`, e.message)
    return NextResponse.json(
      {
        error: 'Failed to inspect row',
        details: e.message,
        sheetId,
        rowNumber
      },
      { status: 500 }
    )
  }
}
