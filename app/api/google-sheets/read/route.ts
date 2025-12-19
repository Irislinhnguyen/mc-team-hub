/**
 * Google Sheets Read Endpoint
 * Đọc data từ Google Sheets bằng OAuth credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getSheetsClient } from '@/lib/services/googleSheetsClient'

interface ReadSheetsRequest {
  spreadsheetId: string
  range?: string // e.g., "Sheet1!A1:D10" or just "Sheet1"
  sheetName?: string // e.g., "Sheet1"
}

export async function POST(request: NextRequest) {
  try {
    const body: ReadSheetsRequest = await request.json()
    const { spreadsheetId, range, sheetName } = body

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'spreadsheetId is required' },
        { status: 400 }
      )
    }

    // Initialize Google Sheets client using centralized service
    const auth = getSheetsClient([
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ])

    const sheets = google.sheets({ version: 'v4', auth })

    // Xác định range để đọc
    const readRange = range || (sheetName ? `${sheetName}` : 'Sheet1')

    console.log(`[Google Sheets] Reading spreadsheet ${spreadsheetId}, range: ${readRange}`)

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: readRange,
    })

    const rows = response.data.values || []

    return NextResponse.json(
      {
        status: 'ok',
        spreadsheetId,
        range: readRange,
        rows,
        rowCount: rows.length,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Google Sheets] Error:', error)

    // Xử lý error messages cụ thể
    let errorMessage = 'Unknown error'
    if (error.message) {
      errorMessage = error.message
    }

    // Nếu là lỗi permission
    if (error.code === 403) {
      errorMessage = 'Permission denied. Make sure the Sheet is shared with the service account email.'
    }

    // Nếu là lỗi not found
    if (error.code === 404) {
      errorMessage = 'Spreadsheet not found. Check the spreadsheet ID.'
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: error.code,
      },
      { status: error.code || 500 }
    )
  }
}

// GET endpoint để test với query params
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const spreadsheetId = searchParams.get('spreadsheetId')
  const range = searchParams.get('range')
  const sheetName = searchParams.get('sheetName')

  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'spreadsheetId query parameter is required' },
      { status: 400 }
    )
  }

  // Reuse POST logic
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, range, sheetName }),
    })
  )
}
