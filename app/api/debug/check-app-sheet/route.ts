/**
 * Debug API: Check Tag Creation_APP sheet structure
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
    const sheetName = 'Tag Creation_APP'

    // Read first row (headers) and a few data rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z5`,
    })

    const rows = response.data.values || []
    const headers = rows[0] || []
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

    const columnMapping = headers.map((header, index) => ({
      column: alphabet[index],
      header: header || '(empty)',
      index,
    }))

    // Sample data for M, N, O
    const sampleData = rows.slice(1, 5).map((row, rowIndex) => ({
      rowNumber: rowIndex + 2,
      M: row[12] || '(empty)',
      N: row[13] || '(empty)',
      O: row[14] || '(empty)',
    }))

    return NextResponse.json({
      success: true,
      sheetName,
      spreadsheetId,
      columnMapping,
      totalColumns: headers.length,
      newColumns: {
        M: { index: 12, header: headers[12] || '(empty)' },
        N: { index: 13, header: headers[13] || '(empty)' },
        O: { index: 14, header: headers[14] || '(empty)' },
      },
      sampleData,
      currentCodeMapping: {
        A: 'Date',
        B: 'SKIP - App ID (removed)',
        C: 'PIC',
        D: 'Appstore URL',
        E: 'SKIP - Approval status',
        F: 'PID',
        G: 'Publisher name',
        H: 'MID',
        I: 'Media Name',
        J: 'ZID',
        K: 'Zone Name',
        L: 'Type',
        M: 'CS/Sales Note (OLD)',
        N: 'SKIP - Content (removed)',
        O: 'SKIP - Ad Unit Name',
        P: 'SKIP - Status YM Note',
        Q: 'Child network code',
        R: 'Company Name',
      }
    })
  } catch (error: any) {
    console.error('[Check APP Sheet] Error:', error)
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: 500 }
    )
  }
}
