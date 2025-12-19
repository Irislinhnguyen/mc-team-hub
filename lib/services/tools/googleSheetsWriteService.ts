/**
 * Google Sheets Write Service
 * Writes extracted zone data to Google Sheets for team collaboration
 */

import { google } from 'googleapis'
import type { ExtractedZone } from '@/lib/types/tools'
import { getSheetsClient } from '@/lib/services/googleSheetsClient'

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

    // Create Google Auth client using centralized service
    const auth = getSheetsClient(['https://www.googleapis.com/auth/spreadsheets'])

    const sheets = google.sheets({ version: 'v4', auth })

    // Find next empty row by reading existing data
    console.log('[Sheets Write] Finding next empty row...')
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, // Just read column A to find last row
    })

    const nextRow = (existingData.data.values?.length || 2) + 1 // Start after last row (minimum row 3)
    console.log(`[Sheets Write] Next empty row: ${nextRow}`)

    // Prepare data rows - Map to sheet structure based on sheet name
    // Tag Creation_WEB: A, B, C, D, F, J-P, R
    // Tag Creation_APP: A, C-D, F-M, Q-R
    const now = new Date()
    // Format date as MM-DD-YYYY
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const formattedDate = `${month}-${day}-${year}`

    const rows = zones.map((zone) => {
      const row = []

      if (sheetName === 'Tag Creation_WEB') {
        // ===== Tag Creation_WEB Mapping =====
        // A: Reg. Date
        row[0] = formattedDate

        // B: PIC
        row[1] = zone.pic || ''

        // C: Company Name (Child pub name)
        row[2] = zone.company_name || ''

        // D: Domain(s)/AppStorelink
        row[3] = zone.appstore_url || ''

        // E: SKIP - Contact

        // F: GAM Network ID
        row[5] = zone.child_network_code || ''

        // G-I: SKIP (Domain Approval, Company Code, Media Type)

        // J: PID
        row[9] = zone.pid || ''

        // K: Publisher name
        row[10] = zone.pubname || ''

        // L: MID
        row[11] = zone.mid || ''

        // M: Media Name
        row[12] = zone.media_name || ''

        // N: ZID
        row[13] = zone.zone_id || ''

        // O: Zone Name
        row[14] = zone.zone_name || ''

        // P: Type (New)
        row[15] = zone.zone_type || ''

        // Q: SKIP - Type (Old)

        // R: Note
        row[17] = zone.cs_sales_note_type || ''
      } else {
        // ===== Tag Creation_APP Mapping (default) =====
        // A: Date (DD-MM-YYYY format)
        row[0] = formattedDate

        // B: SKIP - App ID (removed from UI)

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

        // M: PR (Payout Rate) - NEW
        row[12] = zone.payout_rate || ''

        // N: FP (Floor Price) - NEW
        row[13] = zone.floor_price || ''

        // O: Account (GI/GJ) - NEW
        row[14] = zone.account || 'GI'

        // P: Note (CS/Sales Note) - MOVED from M
        row[15] = zone.cs_sales_note_type || ''

        // Q: Content (Game/Non-game)
        row[16] = zone.content || ''

        // R: SKIP

        // S: SKIP

        // T: Child network code
        row[19] = zone.child_network_code || ''

        // Company Name is NOT used for Team APP
      }

      return row
    })

    // Write to specific cells only (avoiding protected ranges)
    // Use batchUpdate to write to non-contiguous ranges
    const requests = rows.map((row, index) => {
      const rowNumber = nextRow + index
      // Team APP uses A:T (includes Child network code at T), Team WEB uses A:R
      const endColumn = sheetName === 'Tag Creation_APP' ? 'T' : 'R'
      return {
        range: `${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`,
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
    // Create Google Auth client using centralized service
    const auth = getSheetsClient(['https://www.googleapis.com/auth/spreadsheets.readonly'])

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

