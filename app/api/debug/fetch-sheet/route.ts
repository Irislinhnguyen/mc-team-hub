/**
 * Debug API: Fetch rows directly from Google Sheets
 * GET /api/debug/fetch-sheet?spreadsheet_id=...&sheet_name=...&start=314&end=315
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const getGoogleCredentials = () => {
  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
  if (!credentialsBase64) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_BASE64 not set')
  }
  const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8')
  return JSON.parse(credentialsJson)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const spreadsheetId = searchParams.get('spreadsheet_id')
    const sheetName = searchParams.get('sheet_name') || 'SEA_CS'
    const startRow = searchParams.get('start')
    const endRow = searchParams.get('end')

    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'Missing spreadsheet_id parameter'
      }, { status: 400 })
    }

    const credentials = getGoogleCredentials()
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Fetch specific rows
    const range = startRow && endRow
      ? `${sheetName}!A${startRow}:C${endRow}`
      : `${sheetName}!A:C`

    console.log(`[Debug] Fetching: ${range}`)

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'UNFORMATTED_VALUE',
    })

    const rows = response.data.values || []

    return NextResponse.json({
      success: true,
      spreadsheet_id,
      sheet_name: sheetName,
      range,
      row_count: rows.length,
      rows: rows.map((row, index) => {
        const rowNumber = startRow ? parseInt(startRow) + index : index + 1
        return {
          row_number: rowNumber,
          col_a: row[0],
          col_b: row[1],
          col_c: row[2],
          is_empty: !row[0] && !row[1] && !row[2],
          has_key: !!row[0]
        }
      })
    })
  } catch (error: any) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}
