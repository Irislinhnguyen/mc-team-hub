/**
 * Pipeline to Google Sheets Column Mapping
 *
 * This config maps Pipeline database fields to Google Sheets columns
 * for real-time sync (DB → Sheets)
 *
 * REVERSE of scripts/lib/pipeline-column-mapping.cjs
 */

/**
 * Map Pipeline field names to Google Sheets column indices (0-based)
 * Column A = 0, B = 1, C = 2, etc.
 *
 * IMPORTANT: Sync sheet structure (verified 2025-01-18):
 * A: Pipeline ID, B: key (internal), C: Classification, D: POC, E: Team...
 */
export const SHEET_COLUMN_MAPPING: Record<string, number> = {
  // Unique Identifier (CRITICAL: Required for accurate row matching)
  'id': 0,                   // Column A: Pipeline ID (UUID) - UNIQUE KEY

  // Basic Info (Column B is "key" - skip it)
  'classification': 2,       // Column C: Classification
  'poc': 3,                  // Column D: POC
  // SKIP: 'team': 4,        // Column E: Not in form UI
  'pid': 5,                  // Column F: PID
  'publisher': 6,            // Column G: Publisher
  'mid': 8,                  // Column I: MID/siteID
  'domain': 9,               // Column J: Domain
  // SKIP: 'channel': 10,    // Column K: Not in form UI
  // SKIP: 'region': 11,     // Column L: Not in form UI
  // SKIP: 'competitors': 12, // Column M: Not in form UI
  'description': 14,         // Column O: Pipeline detail
  'product': 15,             // Column P: Product

  // Revenue Metrics
  // NOTE: day_gross (Q) and day_net_rev (R) are NOT synced
  // These columns contain formulas in the Google Sheet
  'imp': 18,                 // Column S: IMP (30days)
  'ecpm': 19,                // Column T: eCPM
  'max_gross': 20,           // Column U: Max Gross
  'revenue_share': 21,       // Column V: R/S

  // Action Tracking
  'action_date': 23,         // Column X: Action Date
  'next_action': 24,         // Column Y: Next Action
  'action_detail': 25,       // Column Z: DETAIL
  'action_progress': 26,     // Column AA: Action Progress

  // Status & Timeline
  'starting_date': 28,       // Column AC: Starting Date
  'status': 29,              // Column AD: Status
  // SKIP: 'progress_percent': 30,    // Column AE: % - has formula in sheet
  'proposal_date': 31,       // Column AF: Date of first proposal
  'interested_date': 32,     // Column AG: Interested date
  // SKIP: 'acceptance_date': 33,     // Column AH: AUTO-LOGGED, not user input

  // Quarter Summary
  // NOTE: q_gross (AK) is NOT synced - column contains formula in sheet
}

/**
 * Spreadsheet configuration
 */
export const SPREADSHEET_CONFIG = {
  spreadsheetId: '1nZMTjsDydu2Dp8Vh621q88Wa-4blWG0elFWug8WXonk',
  tabs: {
    sales: 'SEA_Sales',
    cs: 'SEA_CS'
  },
  dataStartRow: 3, // Row 1-2 are headers, data starts at row 3
}

/**
 * Field that serves as row identifier (guaranteed unique)
 * Used to find existing row for updates
 */
export const IDENTIFIER_FIELD = 'id' as const // Pipeline UUID - Column A

/**
 * Get target sheet name based on pipeline group
 */
export function getTargetSheet(group: string | null): string {
  if (group === 'sales') return SPREADSHEET_CONFIG.tabs.sales
  if (group === 'cs') return SPREADSHEET_CONFIG.tabs.cs
  // Default to Sales tab if group not specified
  return SPREADSHEET_CONFIG.tabs.sales
}

/**
 * Get all syncable field names (in order)
 */
export function getSyncableFields(): string[] {
  return Object.keys(SHEET_COLUMN_MAPPING)
}

/**
 * Convert column index to letter (0 → A, 1 → B, etc.)
 */
export function columnIndexToLetter(index: number): string {
  let letter = ''
  let num = index

  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter
    num = Math.floor(num / 26) - 1
  }

  return letter
}

/**
 * Convert field name to A1 notation column (e.g., 'publisher' → 'F')
 */
export function fieldToColumnLetter(fieldName: string): string {
  const columnIndex = SHEET_COLUMN_MAPPING[fieldName]
  if (columnIndex === undefined) {
    throw new Error(`Unknown field: ${fieldName}`)
  }
  return columnIndexToLetter(columnIndex)
}
