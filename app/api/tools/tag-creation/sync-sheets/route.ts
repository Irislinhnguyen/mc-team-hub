/**
 * API Endpoint: POST /api/tools/tag-creation/sync-sheets
 * Syncs extracted zone data to Google Sheets
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/server'
import {
  writeZonesToSheet,
  extractSpreadsheetId,
} from '@/lib/services/tools/googleSheetsWriteService'
import type { ExtractedZone } from '@/lib/types/tools'

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { zones, spreadsheetId: rawSpreadsheetId, sheetName } = body

    // Validate zones
    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return NextResponse.json({ error: 'No zones provided' }, { status: 400 })
    }

    // Validate spreadsheet ID
    if (!rawSpreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 })
    }

    // Extract spreadsheet ID from URL if provided
    let spreadsheetId = rawSpreadsheetId.trim()
    if (spreadsheetId.includes('spreadsheets/d/')) {
      const extracted = extractSpreadsheetId(spreadsheetId)
      if (!extracted) {
        return NextResponse.json(
          {
            error: 'Could not extract spreadsheet ID from URL. Please provide the ID directly.',
          },
          { status: 400 }
        )
      }
      spreadsheetId = extracted
    }

    console.log(
      `[Sync Sheets API] User ${user.id} syncing ${zones.length} zones to spreadsheet ${spreadsheetId}`
    )

    // Write to Google Sheets
    const result = await writeZonesToSheet(spreadsheetId, zones as ExtractedZone[], sheetName)

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`

    console.log(`[Sync Sheets API] Successfully wrote ${result.rowsWritten} rows`)

    return NextResponse.json({
      status: 'success',
      rowsWritten: result.rowsWritten,
      sheetUrl,
      spreadsheetId,
    })
  } catch (error: any) {
    console.error('[Sync Sheets API] Error:', error)

    // Handle permission errors
    if (error.message?.includes('Permission denied')) {
      return NextResponse.json(
        {
          status: 'error',
          error: error.message,
          serviceAccount: 'n8n-bigquery-service@gcpp-check.iam.gserviceaccount.com',
        },
        { status: 403 }
      )
    }

    // Handle not found errors
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        {
          status: 'error',
          error: error.message,
        },
        { status: 404 }
      )
    }

    // Handle invalid sheet name
    if (error.message?.includes('Invalid sheet')) {
      return NextResponse.json(
        {
          status: 'error',
          error: error.message,
        },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to sync data to Google Sheets',
      },
      { status: 500 }
    )
  }
}
