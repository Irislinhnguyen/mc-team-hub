/**
 * Google Sheets Write Service
 * Writes extracted zone data to Google Sheets for team collaboration
 */

import { google } from 'googleapis'
import type { ExtractedZone } from '@/lib/types/tools'

/**
 * Write zones to Google Sheets
 * @param spreadsheetId Google Sheets spreadsheet ID
 * @param zones Array of extracted zone data
 * @param sheetName Name of the sheet to write to (default: "Zone IDs")
 * @returns Number of rows written
 */
export async function writeZonesToSheet(
  spreadsheetId: string,
  zones: any[], // Changed to accept zones with metadata
  sheetName = 'Tag Creation_APP'
): Promise<{ rowsWritten: number }> {
  try {
    console.log(`[Sheets Write] Writing ${zones.length} zones to sheet "${sheetName}"`)

    // Load service account credentials
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}')

    if (!credentials.client_email) {
      throw new Error('Google Service Account credentials not configured')
    }

    // Create Google Auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Find next empty row by reading existing data
    console.log('[Sheets Write] Finding next empty row...')
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, // Just read column A to find last row
    })

    const nextRow = (existingData.data.values?.length || 2) + 1 // Start after last row (minimum row 3)
    console.log(`[Sheets Write] Next empty row: ${nextRow}`)

    // Prepare data rows - Map to "Tag Creation_APP" sheet structure
    // Headers in ROW 1: A-Q (no protected ranges!)
    // Skip columns: E (Approval status), O (Ad Unit Name), P (Status YM Note)
    const now = new Date().toISOString()

    const rows = zones.map((zone) => {
      const row = []

      // A: Date
      row[0] = now.split('T')[0]

      // B: App ID
      row[1] = zone.app_id || ''

      // C: PIC
      row[2] = zone.pic || ''

      // D: Appstore URL
      row[3] = zone.appstore_url || ''

      // E: SKIP - Approval status

      // F: PID
      row[5] = zone.pid || ''

      // G: Publisher name
      row[6] = zone.pubname || ''

      // H: MID
      row[7] = zone.mid || ''

      // I: Media Name
      row[8] = zone.media_name || ''

      // J: ZID
      row[9] = zone.zone_id || ''

      // K: Zone Name
      row[10] = zone.zone_name || ''

      // L: Type
      row[11] = zone.zone_type || ''

      // M: CS/Sales Note
      row[12] = zone.cs_sales_note_type || ''

      // N: Content
      row[13] = zone.content || ''

      // O: SKIP - Ad Unit Name

      // P: SKIP - Status YM Note

      // Q: Child network code
      row[16] = zone.child_network_code || ''

      return row
    })

    // Write to specific cells only (avoiding protected ranges)
    // Use batchUpdate to write to non-contiguous ranges
    const requests = rows.map((row, index) => {
      const rowNumber = nextRow + index
      return {
        range: `${sheetName}!A${rowNumber}:Q${rowNumber}`,
        values: [row],
      }
    })

    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: requests,
      },
    })

    const rowsWritten = response.data.totalUpdatedRows || rows.length

    console.log(`[Sheets Write] Successfully wrote ${rowsWritten} rows`)

    return { rowsWritten }
  } catch (error: any) {
    console.error('[Sheets Write] Error:', error)

    // Handle permission errors
    if (error.code === 403 || error.message?.includes('permission')) {
      throw new Error(
        'Permission denied. Please share the Google Sheet with: n8n-bigquery-service@gcpp-check.iam.gserviceaccount.com (Editor access)'
      )
    }

    // Handle not found errors
    if (error.code === 404) {
      throw new Error('Spreadsheet not found. Please check the spreadsheet ID.')
    }

    // Handle invalid spreadsheet ID
    if (error.message?.includes('Unable to parse range')) {
      throw new Error('Invalid sheet name. Please check the sheet name.')
    }

    throw new Error(`Failed to write to Google Sheets: ${error.message}`)
  }
}

/**
 * Get spreadsheet metadata (for validation)
 */
export async function getSpreadsheetInfo(spreadsheetId: string): Promise<{
  title: string
  sheets: string[]
}> {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}')

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const title = response.data.properties?.title || 'Unknown'
    const sheetNames = response.data.sheets?.map((sheet) => sheet.properties?.title || '') || []

    return { title, sheets: sheetNames }
  } catch (error: any) {
    if (error.code === 403) {
      throw new Error('Permission denied. Please share the spreadsheet with the service account.')
    }

    if (error.code === 404) {
      throw new Error('Spreadsheet not found.')
    }

    throw new Error(`Failed to get spreadsheet info: ${error.message}`)
  }
}

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
  const match = url.match(regex)
  return match ? match[1] : null
}

