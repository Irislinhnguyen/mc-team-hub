/**
 * Debug API: Check Tag Creation_WEB sheet structure
 */

import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getSheetsClient } from '@/lib/services/googleSheetsClient'

export async function GET() {
  try {
    // Initialize Google Sheets client using centralized service
    const auth = getSheetsClient(['https://www.googleapis.com/auth/spreadsheets.readonly'])

    const sheets = google.sheets({ version: 'v4', auth })

    const spreadsheetId = '1gfCTHCfpTqhb6pzpEhkYx3RxvMhOlhB4pB2iUlSWBNs'
    const sheetName = 'Tag Creation_WEB'

    // Read first row (headers)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    })

    const headers = response.data.values?.[0] || []
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

    const columnMapping = headers.map((header, index) => ({
      column: alphabet[index],
      header: header || '(empty)',
      index,
    }))

    return NextResponse.json({
      success: true,
      sheetName,
      spreadsheetId,
      columnMapping,
      totalColumns: headers.length,
    })
  } catch (error: any) {
    console.error('[Check Web Sheet] Error:', error)
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: 500 }
    )
  }
}
