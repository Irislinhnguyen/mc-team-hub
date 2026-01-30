/**
 * Sheet to Database Sync Service (UPSERT MODE)
 *
 * Core sync algorithm for quarterly pipeline workflow:
 * - Fetches data from Google Sheets
 * - UPSERTS pipelines: CREATE new or UPDATE existing
 * - Uses unique constraint: (key, proposal_date, quarterly_sheet_id)
 * - Same sheet sync → UPDATE existing pipelines
 * - Different sheet sync → CREATE all pipelines (different quarterly_sheet_id)
 * - Proposal dates are preserved to track pipeline lifecycle across quarters
 *
 * This allows users to:
 * - Sync the same sheet multiple times (updates existing pipelines)
 * - Copy pipelines from Q1 to Q2 (creates new records in different quarter)
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { transformRowToPipeline, extractMonthlyForecasts, validateRowStructure } from './sheetTransformers'
import { getSheetsClient } from './googleSheetsClient'

// ========================================
// CS Column Mapping Constants
// ========================================

/**
 * Column mapping for SEA_CS Google Sheet
 * Inlined from scripts/lib/pipeline-column-mapping-cs.cjs
 * to avoid dynamic require in production
 *
 * CRITICAL: CS sheet has ZID at column 9, NOT Channel!
 * Column 9 (J): ZID
 * Column 10 (K): Channel
 * Column 11 (L): Competitors
 * NO Region field in CS sheet
 */
const COLUMN_MAPPING_CS = {
  // Basic Info (0-22) - DIFFERENT from Sales at column 9!
  0: { field: 'key', type: 'string', required: true },
  1: { field: 'classification', type: 'string' },
  2: { field: 'poc', type: 'string', required: true },
  3: { field: 'team', type: 'string' },
  5: { field: 'pid', type: 'string' },
  6: { field: 'publisher', type: 'string', required: true },
  7: { field: 'mid', type: 'string' },
  8: { field: 'domain', type: 'string' },
  9: { field: 'zid', type: 'string' },           // J: ZID (CS-specific!)
  10: { field: 'channel', type: 'string' },      // K: Channel
  11: { field: 'competitors', type: 'string' },  // L: Competitors
  // NOTE: CS sheet does NOT have Region field (unlike Sales)
  13: { field: 'description', type: 'string' },
  14: { field: 'product', type: 'string' },
  15: { field: 'day_gross', type: 'decimal' },
  16: { field: 'day_net_rev', type: 'decimal' },
  17: { field: 'imp', type: 'bigint' },
  18: { field: 'ecpm', type: 'decimal' },
  19: { field: 'max_gross', type: 'decimal' },
  20: { field: 'revenue_share', type: 'decimal' },
  22: { field: 'action_date', type: 'date' },
  // CS-Specific: Action Fields (23-25)
  23: { field: 'action_detail', type: 'string' },
  24: { field: 'action_progress', type: 'string' },
  25: { field: 'next_action', type: 'string' },
  // Status & Timeline (27-34)
  27: { field: 'starting_date', type: 'date' },
  28: { field: 'status', type: 'string', default: '【E】' },
  29: { field: 'progress_percent', type: 'integer' },
  30: { field: 'proposal_date', type: 'date' },
  31: { field: 'interested_date', type: 'date' },
  32: { field: 'acceptance_date', type: 'date' },
  // CS-Specific: Status Transition Dates (33-34)
  33: { field: 'ready_to_deliver_date', type: 'date' },
  34: { field: 'closed_date', type: 'date' },
  // Quarter Summary (35-36)
  35: { field: 'q_gross', type: 'decimal' },
  36: { field: 'q_net_rev', type: 'decimal' },
}

const MONTHLY_COLUMNS_CS = {
  endDates: { start: 49, count: 15, field: 'end_date' },
  deliveryDays: { start: 64, count: 15, field: 'delivery_days' },
  validation: { start: 79, count: 15, field: 'validation_flag' }
}

const VALID_STATUSES_CS = [
  '【S】', '【S-】', '【A】', '【B】', '【C+】', '【C】', '【C-】', '【D】', '【E】', '【Z】'
]

const DEFAULT_VALUES_CS = {
  status: '【E】',
  progress_percent: 0,
  forecast_type: 'estimate',
  metadata: {}
}

// Export column mapping constants for sheetTransformers.ts to use
export {
  COLUMN_MAPPING_CS,
  MONTHLY_COLUMNS_CS,
  VALID_STATUSES_CS,
  DEFAULT_VALUES_CS
}

// ========================================
// Sales Column Mapping Constants
// ========================================

/**
 * Column mapping for SEA_Sales Google Sheet
 * Inlined from scripts/lib/pipeline-column-mapping-sales.cjs
 * to avoid dynamic require in production
 *
 * Key differences from CS:
 * - Column 2: "AM" (CS is "PIC")
 * - Columns 4-5: MA/MI at E, PID at F (same as CS!)
 * - Column 11: Competitors (no Region field in Sales)
 * - Column 14 (O): Product (Sales has Product at O, CS has Product at N)
 * - Action fields (21-26): Different order from CS
 * - Timeline columns (27-32): Different order from CS
 * - Column 35 (AJ): C+↑ (Sales-specific, pushes quarterly columns +1)
 * - Quarterly columns: Sales at 36-37 (AK-AL), CS at 35-36 (AJ-AK)
 * - Quarterly breakdown: Sales at 38-49 (AM-AX), CS at 37-48 (AL-AW)
 * - Monthly columns: Sales start at 50/65/80, CS at 49/64/79
 */
const COLUMN_MAPPING_SALES = {
  // Basic Info (0-14) - SAME as CS except column 2 (PIC vs AM)
  0: { field: 'key', type: 'string', required: true },
  1: { field: 'classification', type: 'string' },
  2: { field: 'poc', type: 'string', required: true },
  3: { field: 'team', type: 'string' },
  4: { field: 'ma_mi', type: 'string' },                     // E: MA/MI
  5: { field: 'pid', type: 'string' },                       // F: PID (same as CS!)
  6: { field: 'publisher', type: 'string', required: true }, // G: Publisher
  7: { field: 'mid', type: 'string' },                      // H: MID/siteID
  8: { field: 'domain', type: 'string' },                   // I: domain
  9: { field: 'zid', type: 'string' },                       // J: ZID (same as CS!)
  10: { field: 'channel', type: 'string' },                  // K: Channel
  11: { field: 'competitors', type: 'string' },              // L: Competitors
  // Column 12 (M: Pipeline Quarter) - stored in metadata
  13: { field: 'description', type: 'string' },              // N: Pipeline detail
  // Column 14 (O): Product - Sales has Product at O, not at J
  14: { field: 'product', type: 'string' },                  // O: Product
  // Revenue Metrics - Start at column 15 (P)
  15: { field: 'day_gross', type: 'decimal' },               // P: day gross
  16: { field: 'day_net_rev', type: 'decimal' },             // Q: day net rev
  17: { field: 'imp', type: 'bigint' },                      // R: IMP (30days)
  18: { field: 'ecpm', type: 'decimal' },                    // S: eCPM
  19: { field: 'max_gross', type: 'decimal' },               // T: Max Gross
  20: { field: 'revenue_share', type: 'decimal' },           // U: R/S
  // Column 21 (V: Action Date) - stored in metadata
  // Sales-Specific: Action Fields (22-25) - Different order from CS
  22: { field: 'action_date', type: 'date' },                // W: Action Date
  23: { field: 'next_action', type: 'string' },              // X: Next Action
  24: { field: 'action_detail', type: 'string' },            // Y: DETAIL
  25: { field: 'action_progress', type: 'string' },          // Z: Action Progress
  // Column 26 (AA: Update Target) - stored in metadata
  // Status & Timeline (27-32) - Match Google Sheet columns
  27: { field: 'starting_date', type: 'date' },              // AB: Starting Date
  28: { field: 'status', type: 'string', default: '【E】' },  // AC: Status ✓
  29: { field: 'progress_percent', type: 'integer' },        // AD: % ✓
  30: { field: 'proposal_date', type: 'date' },              // AE: Date of first proposal ✓
  31: { field: 'interested_date', type: 'date' },            // AF: Interested date
  32: { field: 'acceptance_date', type: 'date' },            // AG: Acceptance date
  // Status Transition Dates (33-34) - same as CS
  33: { field: 'ready_to_deliver_date', type: 'date' },      // AH: 【A】
  34: { field: 'closed_date', type: 'date' },                // AI: 【Z】
  // Sales-Specific: C+↑ at column 35 (pushes quarterly columns +1)
  35: { field: 'c_plus_upgrade', type: 'string' },           // AJ: C+↑
  // Quarter Summary - Sales has +1 offset due to C+↑ column
  36: { field: 'q_gross', type: 'decimal' },                 // AK: GR
  37: { field: 'q_net_rev', type: 'decimal' },               // AL: NR
}

const MONTHLY_COLUMNS_SALES = {
  endDates: { start: 50, count: 15, field: 'end_date' },
  deliveryDays: { start: 65, count: 15, field: 'delivery_days' },
  validation: { start: 80, count: 15, field: 'validation_flag' }
}

const VALID_STATUSES_SALES = [
  '【S】', '【S-】', '【A】', '【B】', '【C+】', '【C】', '【C-】', '【D】', '【E】', '【Z】'
]

const DEFAULT_VALUES_SALES = {
  status: '【E】',
  progress_percent: 0,
  forecast_type: 'estimate',
  metadata: {}
}

// Export Sales column mapping constants for sheetTransformers.ts to use
export {
  COLUMN_MAPPING_SALES,
  MONTHLY_COLUMNS_SALES,
  VALID_STATUSES_SALES,
  DEFAULT_VALUES_SALES
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

export interface QuarterlySheet {
  id: string
  year: number
  quarter: number
  spreadsheet_id: string
  sheet_name: string
  group: 'sales' | 'cs'
  sync_status: 'active' | 'paused' | 'archived'
}

export interface SyncResult {
  success: boolean
  total: number
  created: number
  updated: number
  deleted: number
  errors: string[]
  duration_ms: number
}

interface PipelineRow {
  key: string
  proposal_date: string
  [key: string]: any
}

/**
 * Syncable fields (ignore computed/auto-logged fields)
 *
 * These fields are synced directly from Google Sheets to database
 * Auto-calculated fields (like timestamps) are NOT in this list
 */
const SYNCABLE_FIELDS = [
  // Basic Info
  'key',
  'classification',
  'poc',
  'team',
  'pid',
  'publisher',
  'mid',
  'medianame',
  'domain',
  'channel',
  'region',
  'product',
  'description',
  'competitors',

  // Revenue Metrics
  'imp',
  'ecpm',
  'revenue_share',
  'day_gross',
  'day_net_rev',
  'max_gross',
  'q_gross',
  'q_net_rev',

  // Action Tracking
  'action_date',
  'next_action',
  'action_detail',
  'action_progress',

  // Status & Timeline
  'status',
  'progress_percent',
  'starting_date',
  'proposal_date',

  // ⚠️ NEW: Status Transition Dates (synced from sheet, not auto-calculated)
  'interested_date',       // C/C-
  'acceptance_date',       // B
  'ready_to_deliver_date', // A
  'actual_starting_date',  // S-
  'close_won_date',        // S
  'closed_date',           // Z (NEW)

  // ⚠️ NEW: Additional Fields
  'zid',                   // Zone ID (Sales only)
  'end_date'               // Pipeline end date
]

/**
 * Initialize Google Sheets API client
 * Uses the centralized getSheetsClient from googleSheetsClient.ts
 */
async function getGoogleSheetsClient() {
  // Use the centralized auth client which supports:
  // - GOOGLE_APPLICATION_CREDENTIALS_JSON (inline JSON)
  // - GOOGLE_APPLICATION_CREDENTIALS_BASE64 (base64 encoded)
  const auth = getSheetsClient([
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ])

  return google.sheets({ version: 'v4', auth })
}

/**
 * Sanitize cell value by removing control characters that break JSON
 */
function sanitizeCellValue(value: any): any {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    // Remove all control characters except \n, \r, \t which we want to preserve
    // But escape them properly
    return value
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove problematic control chars
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\r/g, '') // Remove carriage returns
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .trim()
  }

  return value
}

/**
 * Sanitize all rows to remove control characters
 */
function sanitizeRows(rows: any[][]): any[][] {
  return rows.map(row => row.map(cell => sanitizeCellValue(cell)))
}

/**
 * Sanitize entire object recursively
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return null

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }

  // Handle strings
  if (typeof obj === 'string') {
    return sanitizeCellValue(obj)
  }

  // Handle objects (recurse)
  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }

  // Return other types as-is (numbers, booleans, etc.)
  return obj
}

/**
 * Sanitize data fetched from database
 * Removes control characters from all string fields in database records
 */
function sanitizeDatabaseResponse<T>(data: T | T[] | null): T | T[] | null {
  if (!data) return data
  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item))
  }
  return sanitizeObject(data)
}

/**
 * Fetch all rows from a Google Sheet
 */
async function fetchSheetData(
  spreadsheetId: string,
  sheetName: string
): Promise<any[][]> {
  const sheets = await getGoogleSheetsClient()

  // Fetch all data (A:CZ covers up to column 104)
  const range = `${sheetName}!A:CZ`

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE', // Get raw values, not formatted strings
    dateTimeRenderOption: 'SERIAL_NUMBER' // Get dates as Excel serial numbers
  })

  const rows = response.data.values || []

  // Sanitize rows to remove control characters
  const sanitizedRows = sanitizeRows(rows)

  // Skip header rows (rows 1-2 are headers, data starts at row 3)
  return sanitizedRows.slice(2)
}

/**
 * Fetch specific rows by row numbers (for incremental sync)
 * More efficient than fetching all rows when only a few changed
 */
async function fetchSpecificRows(
  spreadsheetId: string,
  sheetName: string,
  rowNumbers: number[]
): Promise<any[][]> {
  console.log(`[FetchSpecificRows] Fetching ${rowNumbers.length} rows...`)
  const sheets = await getGoogleSheetsClient()

  // Build ranges for each row (A:CZ covers up to column 104)
  const ranges = rowNumbers.map(row => `${sheetName}!A${row}:CZ${row}`)
  console.log(`[FetchSpecificRows] Ranges:`, ranges.slice(0, 3).join(', '), '...')

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER'
  })

  console.log(`[FetchSpecificRows] Response received`)

  // Extract values from each range
  const rawRows = response.data.valueRanges
    ?.map(range => range.values && range.values.length > 0 ? range.values[0] : null)
    .filter(row => row !== null) || []

  console.log(`[FetchSpecificRows] Extracted ${rawRows.length} rows`)

  // Sanitize rows to remove control characters
  const sanitizedRows = sanitizeRows(rawRows)
  console.log(`[FetchSpecificRows] ✅ Sanitized ${sanitizedRows.length} rows`)

  return sanitizedRows
}

/**
 * NOTE: Composite key matching removed in append-only mode
 * Each quarterly sheet is independent - no matching needed
 */

/**
 * Parse sheet rows into pipeline objects
 */
function parseSheetRows(
  rows: any[][],
  userId: string,
  group: 'sales' | 'cs',
  quarterlySheetId: string,
  fiscalYear: number,
  fiscalQuarter: number
): PipelineRow[] {
  const pipelines: PipelineRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const sheetRowNumber = i + 3 // Row 3 is first data row

    // Skip empty rows (check if columns A, B, C are all empty)
    if (!row[0] && !row[1] && !row[2]) continue

    // Skip rows without key (Column A)
    // Fix: Check for null/undefined first, then check if empty string
    // This allows keys like "0" or "0001" which are falsy but valid
    if (row[0] == null || (typeof row[0] === 'string' && row[0].trim() === '')) {
      console.warn(`Row ${sheetRowNumber}: Skipping - no key in Column A`)
      continue
    }

    // Validate row structure before transformation
    const validation = validateRowStructure(row, group)
    if (!validation.valid) {
      console.error(`Row ${sheetRowNumber}: ${validation.error}`)
      continue
    }

    try {
      // Transform row using existing transformer
      const pipeline = transformRowToPipeline(row, userId, group, fiscalYear)

      // CRITICAL: Sanitize entire pipeline object to prevent JSON parsing errors
      const sanitizedPipeline = sanitizeObject(pipeline)

      // Add quarterly_sheet_id
      sanitizedPipeline.quarterly_sheet_id = quarterlySheetId

      // Add sheet row number
      sanitizedPipeline.sheet_row_number = sheetRowNumber

      // CRITICAL: Set fiscal_quarter and fiscal_year from quarterly sheet metadata
      // This ensures pipelines are correctly filtered by quarter in the UI
      sanitizedPipeline.fiscal_quarter = fiscalQuarter
      sanitizedPipeline.fiscal_year = fiscalYear

      // Ensure key is set from Column A (sanitize it!)
      if (!sanitizedPipeline.key) {
        sanitizedPipeline.key = sanitizeCellValue(row[0]?.toString()?.trim() || '')
      }

      // CRITICAL: Sanitize again after adding new fields
      const finalPipeline = sanitizeObject(sanitizedPipeline)

      pipelines.push(finalPipeline)
    } catch (error: any) {
      // Enhanced error logging for debugging
      console.error(`\n❌ Row ${sheetRowNumber}: Transformation failed`)
      console.error(`   Key (Col A): ${row[0]}`)
      console.error(`   Publisher (Col G): ${row[6]}`)
      console.error(`   Row length: ${row.length} columns`)
      console.error(`   Error: ${error.message}`)

      // Log first few non-null values for context
      const nonNullValues = row.slice(0, 20).map((val, idx) =>
        val != null ? `[${idx}]: ${String(val).substring(0, 30)}` : null
      ).filter(Boolean)
      console.error(`   Sample values: ${nonNullValues.slice(0, 5).join(', ')}`)
      continue
    }
  }

  return pipelines
}

/**
 * Main sync function: sync quarterly sheet to database (UPSERT MODE)
 * @param quarterlySheetId - ID of quarterly sheet record
 * @param userId - Optional: User ID of who triggered the sync
 * @param userEmail - Optional: Email of user who triggered the sync
 * @param changedRows - Optional array of row numbers for incremental sync
 */
export async function syncQuarterlySheet(
  quarterlySheetId: string,
  userId?: string,
  userEmail?: string,
  changedRows?: number[]
): Promise<SyncResult> {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    console.log(`[Sync] ============================================`)
    console.log(`[Sync] STARTING SYNC FOR: ${quarterlySheetId}`)
    console.log(`[Sync] ============================================`)

    // Step 1: Fetch quarterly sheet config
    console.log(`[Sync] Step 1: Fetching quarterly sheet config...`)
    const { data: quarterlySheet, error: qsError } = await supabase
      .from('quarterly_sheets')
      .select('*')
      .eq('id', quarterlySheetId)
      .single()

    if (qsError || !quarterlySheet) {
      throw new Error(`Quarterly sheet not found: ${quarterlySheetId}`)
    }

    console.log(`[Sync] ✅ Quarterly sheet found: ${quarterlySheet.sheet_name}`)

    // Sanitize database response to remove control characters
    const sanitizedQuarterlySheet = sanitizeDatabaseResponse(quarterlySheet) as typeof quarterlySheet

    if (sanitizedQuarterlySheet.sync_status !== 'active') {
      throw new Error(`Sync is paused for sheet: ${sanitizedQuarterlySheet.sheet_name}`)
    }

    // Step 2: Fetch sheet data from Google Sheets
    let sheetRows: any[][]

    if (changedRows && changedRows.length > 0) {
      // INCREMENTAL SYNC: Fetch only changed rows (faster, less resource intensive)
      console.log(`[Sync] 🎯 Incremental sync: Fetching ${changedRows.length} changed rows from ${sanitizedQuarterlySheet.sheet_name}...`)

      // CRITICAL: Sanitize spreadsheet_id to ensure it doesn't have control characters
      const sanitizedSpreadsheetId = sanitizeCellValue(sanitizedQuarterlySheet.spreadsheet_id)
      console.log(`[Sync] Spreadsheet ID: ${sanitizedSpreadsheetId}`)
      console.log(`[Sync] Sheet name: ${sanitizedQuarterlySheet.sheet_name}`)
      console.log(`[Sync] Changed rows:`, changedRows)

      sheetRows = await fetchSpecificRows(
        sanitizedSpreadsheetId,
        sanitizedQuarterlySheet.sheet_name,
        changedRows
      )
      console.log(`[Sync] ✅ Fetched ${sheetRows.length} rows (${changedRows.length} requested)`)
    } else {
      // FULL SYNC: Fetch all rows
      console.log(`[Sync] 📄 Full sync: Fetching all rows from ${sanitizedQuarterlySheet.sheet_name}...`)
      sheetRows = await fetchSheetData(
        sanitizedQuarterlySheet.spreadsheet_id,
        sanitizedQuarterlySheet.sheet_name
      )
      console.log(`[Sync] Found ${sheetRows.length} rows in sheet`)
    }

    // Step 3: Parse sheet rows
    // Get user_id (for now, use first user - TODO: make configurable)
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000'

    const sheetPipelines = parseSheetRows(
      sheetRows,
      userId,
      sanitizedQuarterlySheet.group,
      quarterlySheetId,
      sanitizedQuarterlySheet.year,
      sanitizedQuarterlySheet.quarter
    )

    // CRITICAL FIX: Sanitize ALL sheet pipelines to remove control characters
    const sanitizedSheetPipelines = sheetPipelines.map(p => sanitizeObject(p))

    console.log(`[Sync] Parsed ${sanitizedSheetPipelines.length} valid pipelines (sanitized)`)

    // Step 4: UPSERT MODE - Create new or update existing pipelines
    // Same sheet sync → UPDATE existing pipelines
    // Different sheet sync → CREATE all pipelines
    console.log('[Sync] 📝 UPSERT MODE: Creating new or updating existing pipelines...')

    const toUpsert = sanitizedSheetPipelines

    console.log(`[Sync] Ready to sync ${toUpsert.length} pipelines to database`)

    // CRITICAL: Test if we can stringify the entire batch before upserting
    try {
      JSON.stringify(toUpsert)
      console.log('[Sync] ✅ All pipelines can be stringified (batch test passed)')
    } catch (e: any) {
      console.error('[Sync] ❌ Cannot stringify batch of pipelines!')
      console.error('[Sync] Error:', e.message)

      // Find which pipeline is problematic
      for (let i = 0; i < toUpsert.length; i++) {
        try {
          JSON.stringify(toUpsert[i])
        } catch (e2: any) {
          console.error(`[Sync] ❌ Pipeline at index ${i} (row ${toUpsert[i].sheet_row_number}) cannot be stringified`)
          console.error('[Sync] Key:', toUpsert[i].key)

          // Find which field is problematic
          for (const key in toUpsert[i]) {
            try {
              JSON.stringify({ [key]: toUpsert[i][key] })
            } catch (e3) {
              console.error(`[Sync] ❌ Field "${key}" has control characters:`, toUpsert[i][key])
            }
          }
        }
      }

      throw new Error('Cannot stringify pipelines for database upsert')
    }

    // Step 5: Fetch existing pipelines for this quarterly sheet to track created vs updated
    console.log(`[Sync] 🔍 Checking existing pipelines in quarterly sheet ${quarterlySheetId}...`)

    const { data: existingPipelines, error: fetchError } = await supabase
      .from('pipelines')
      .select('id, sheet_row_number, key')
      .eq('quarterly_sheet_id', quarterlySheetId)

    if (fetchError) {
      console.error('[Sync] ⚠️  Warning: Could not fetch existing pipelines:', fetchError.message)
      // Continue anyway - we'll try to insert all
    }

    // Build map for quick lookup: sheet_row_number -> full record
    // CRITICAL FIX: Use sheet_row_number as unique key instead of (key, proposal_date)
    // Because each row in Google Sheets is unique and should only have 1 pipeline record
    const existingRowMap = new Map(
      existingPipelines?.map(p => [p.sheet_row_number, p]) || []
    )

    console.log(`[Sync] Found ${existingRowMap.size} existing pipelines in this quarterly sheet`)

    // Step 6: Split into two groups - UPDATE existing, INSERT new
    // Use Maps to prevent duplicates
    const toUpdateMap = new Map<string, any>() // id -> pipeline
    const toCreateMap = new Map<string, any>() // key_proposalDate -> pipeline

    for (const pipeline of toUpsert) {
      try {
        // CRITICAL: Test stringification
        try {
          JSON.stringify(pipeline)
        } catch (e: any) {
          console.error(`[Sync] ❌ Cannot stringify pipeline ${pipeline.key} (row ${pipeline.sheet_row_number})`)
          errors.push(`Cannot stringify pipeline ${pipeline.key}: ${e.message}`)
          continue
        }

        // Sanitize pipeline object
        const sanitized = sanitizeObject(pipeline)

        // Test again after sanitization
        try {
          JSON.stringify(sanitized)
        } catch (e: any) {
          console.error(`[Sync] ❌ Cannot stringify sanitized pipeline ${pipeline.key} (row ${pipeline.sheet_row_number})`)
          errors.push(`Cannot stringify sanitized pipeline ${pipeline.key}: ${e.message}`)
          continue
        }

        // Check if exists and split into groups
        // CRITICAL FIX: Check by sheet_row_number FIRST (not by key)
        // Because each row in sheet is unique - UPDATE existing, INSERT new
        const existingRecord = existingRowMap.get(sanitized.sheet_row_number)

        if (existingRecord) {
          // UPDATE existing record at this row number
          toUpdateMap.set(existingRecord.id, { ...sanitized, id: existingRecord.id })
        } else {
          // INSERT new record - use sheet_row_number as key to prevent duplicates
          toCreateMap.set(sanitized.sheet_row_number, sanitized)
        }
      } catch (error: any) {
        errors.push(`Failed to process pipeline ${pipeline.key}: ${error.message}`)
      }
    }

    // Convert Maps back to arrays
    const toUpdate = Array.from(toUpdateMap.values())
    const toCreate = Array.from(toCreateMap.values())

    console.log(`[Sync] ✅ Split: ${toCreate.length} new, ${toUpdate.length} existing (deduplicated)`)

    // Step 7: Batch UPDATE existing pipelines (using upsert with primary key)
    let updatedCount = 0

    if (toUpdate.length > 0) {
      console.log(`[Sync] 🔄 Updating ${toUpdate.length} existing pipelines...`)
      console.log(`[Sync] Will process ${Math.ceil(toUpdate.length / 100)} batches`)

      const batchSize = 100
      let batchNumber = 0
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        batchNumber++
        const batchStart = i
        const batchEnd = Math.min(i + batchSize, toUpdate.length)
        console.log(`[Sync] Batch ${batchNumber}: Processing rows ${batchStart + 1}-${batchEnd} (${batchEnd - batchStart} pipelines)`)

        const batch = toUpdate.slice(i, i + batchSize)

        // Validate each pipeline can be serialized before upsert
        const validBatch: typeof batch = []
        for (const pipeline of batch) {
          try {
            JSON.stringify(pipeline) // Test serialization
            validBatch.push(pipeline)
          } catch (e: any) {
            console.error(`Row ${pipeline.sheet_row_number}: Cannot serialize - may contain control characters`)
            errors.push(`Row ${pipeline.sheet_row_number}: JSON serialization failed`)
          }
        }

        if (validBatch.length === 0) {
          console.warn(`Batch ${batchNumber}: All rows failed validation, skipping`)
          continue
        }

        if (validBatch.length < batch.length) {
          console.warn(`Batch ${batchNumber}: ${batch.length - validBatch.length} rows failed validation`)
        }

        console.log(`[Sync] Batch ${batchNumber}: Upserting ${validBatch.length} pipelines to database...`)

        // WORKAROUND: Strip metadata before upsert to avoid Supabase schema cache issues
        // Supabase sometimes throws "column not found in schema cache" for JSONB fields
        const pipelinesWithoutMetadata = validBatch.map(({ metadata, monthly_forecasts, ...rest }) => rest)
        const metadataMap = new Map(validBatch.map(p => [p.id, p.metadata]))

        let updateError
        try {
          const result = await supabase
            .from('pipelines')
            .upsert(pipelinesWithoutMetadata, {
              onConflict: 'id' // Use primary key for update
            })
          updateError = result.error
        } catch (e: any) {
          console.error(`[Sync] ❌ Batch ${batchNumber}: Exception during upsert:`, e.message)
          errors.push(`Batch ${batchNumber} exception: ${e.message}`)
          continue
        }

        if (updateError) {
          console.error(`[Sync] ❌ Batch ${batchNumber}: Upsert failed: ${updateError.message}`)
          errors.push(`Batch ${batchNumber} update failed: ${updateError.message}`)
        } else {
          // Update metadata separately for each pipeline
          let metadataUpdateErrors = 0
          for (const [pipelineId, metadata] of metadataMap.entries()) {
            try {
              const { error: metaError } = await supabase
                .from('pipelines')
                .update({ metadata })
                .eq('id', pipelineId)

              if (metaError) {
                metadataUpdateErrors++
                console.warn(`[Sync] Batch ${batchNumber}: Failed to update metadata for pipeline ${pipelineId}`)
              }
            } catch (e: any) {
              metadataUpdateErrors++
            }
          }

          updatedCount += validBatch.length
          if (metadataUpdateErrors > 0) {
            console.warn(`[Sync] ✅ Batch ${batchNumber}: ${validBatch.length} updated (${metadataUpdateErrors} metadata updates failed)`)
          } else {
            console.log(`[Sync] ✅ Batch ${batchNumber}: ${validBatch.length} updated successfully`)
          }
        }
      }
    }

    // Step 8: Batch INSERT new pipelines
    let createdCount = 0

    if (toCreate.length > 0) {
      console.log(`[Sync] ➕ Creating ${toCreate.length} new pipelines...`)

      const batchSize = 100
      let batchNumber = 0
      for (let i = 0; i < toCreate.length; i += batchSize) {
        batchNumber++
        const batch = toCreate.slice(i, i + batchSize)

        // Validate each pipeline can be serialized before insert
        const validBatch: typeof batch = []
        for (const pipeline of batch) {
          try {
            JSON.stringify(pipeline) // Test serialization
            validBatch.push(pipeline)
          } catch (e: any) {
            console.error(`Row ${pipeline.sheet_row_number}: Cannot serialize - may contain control characters`)
            errors.push(`Row ${pipeline.sheet_row_number}: JSON serialization failed`)
          }
        }

        if (validBatch.length === 0) {
          console.warn(`Batch ${batchNumber}: All rows failed validation, skipping`)
          continue
        }

        if (validBatch.length < batch.length) {
          console.warn(`Batch ${batchNumber}: ${batch.length - validBatch.length} rows failed validation`)
        }

        console.log(`[Sync] Batch ${batchNumber}: Inserting ${validBatch.length} pipelines...`)

        // WORKAROUND: Strip metadata before insert to avoid Supabase schema cache issues
        const pipelinesWithoutMetadata = validBatch.map(({ metadata, monthly_forecasts, ...rest }) => rest)
        const metadataMap = new Map<string, any>()

        let insertError
        try {
          const result = await supabase
            .from('pipelines')
            .insert(pipelinesWithoutMetadata)
            .select('id')

          insertError = result.error

          if (!insertError && result.data) {
            // Map inserted IDs to their metadata
            result.data.forEach((row, idx) => {
              metadataMap.set(row.id, validBatch[idx].metadata)
            })
          }
        } catch (e: any) {
          console.error(`[Sync] ❌ Batch ${batchNumber}: Exception during insert:`, e.message)
          errors.push(`Batch ${batchNumber} exception: ${e.message}`)
          continue
        }

        if (insertError) {
          console.error(`[Sync] ❌ Batch ${batchNumber}: Insert failed: ${insertError.message}`)
          errors.push(`Batch ${batchNumber} insert failed: ${insertError.message}`)
        } else {
          // Update metadata separately for each inserted pipeline
          let metadataUpdateErrors = 0
          for (const [pipelineId, metadata] of metadataMap.entries()) {
            try {
              const { error: metaError } = await supabase
                .from('pipelines')
                .update({ metadata })
                .eq('id', pipelineId)

              if (metaError) {
                metadataUpdateErrors++
              }
            } catch (e: any) {
              metadataUpdateErrors++
            }
          }

          createdCount += validBatch.length
          if (metadataUpdateErrors > 0) {
            console.warn(`[Sync] ✅ Batch ${batchNumber}: ${validBatch.length} created (${metadataUpdateErrors} metadata updates failed)`)
          } else {
            console.log(`[Sync] ✅ Batch ${batchNumber}: ${validBatch.length} created successfully`)
          }
        }
      }
    }

    console.log(`[Sync] ✅ All batches processed`)
    console.log(`[Sync] ✅ Sync completed: ${createdCount} created, ${updatedCount} updated`)


    // Step 9: Log sync result
    const duration = Date.now() - startTime

    // Calculate actual failed pipelines (not just batch errors)
    const totalExpected = toCreate.length + toUpdate.length
    const totalSynced = createdCount + updatedCount
    const actualFailed = totalExpected - totalSynced

    // Only mark as partial if pipelines actually failed to sync
    const hasRealFailures = actualFailed > 0
    const statusToLog = hasRealFailures ? 'partial' : 'success'

    console.log(`[Sync] 📊 Final stats: ${totalSynced}/${totalExpected} synced, ${actualFailed} failed`)
    console.log(`[Sync] 📊 Status: ${statusToLog}`)

    await supabase.from('pipeline_sync_log').insert({
      quarterly_sheet_id: quarterlySheetId,
      user_id: userId || null,
      user_email: userEmail || 'Webhook',
      sync_type: 'batch',
      sync_direction: 'sheet_to_db',
      target_sheet: sanitizedQuarterlySheet.sheet_name,
      status: statusToLog,
      rows_processed: sanitizedSheetPipelines.length,
      rows_created: createdCount,
      rows_updated: updatedCount, // UPSERT mode: tracks both creates and updates
      rows_deleted: 0, // UPSERT mode: no deletes
      processing_duration_ms: duration
    })

    // Update quarterly sheet sync status
    await supabase
      .from('quarterly_sheets')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: statusToLog,
        last_sync_error: hasRealFailures
          ? `${actualFailed} pipelines failed to sync. ${errors.map(e => sanitizeCellValue(e)).join('; ')}`
          : null
      })
      .eq('id', quarterlySheetId)

    console.log(`[Sync] ✅ Sync completed: ${createdCount} created, ${updatedCount} updated in ${duration}ms`)

    return {
      success: errors.length === 0,
      total: sanitizedSheetPipelines.length,
      created: createdCount,
      updated: updatedCount, // UPSERT mode: tracks both creates and updates
      deleted: 0,
      errors,
      duration_ms: duration
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    // CRITICAL: Sanitize error message before logging or inserting
    const sanitizedMessage = (error.message || 'Unknown error')
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .trim()

    console.error(`[Sync] ❌ SYNC FAILED: ${sanitizedMessage}`)
    console.error(`[Sync] Stack:`, error.stack)

    // Log failure
    await supabase.from('pipeline_sync_log').insert({
      quarterly_sheet_id: quarterlySheetId,
      user_id: userId || null,
      user_email: userEmail || 'Webhook',
      sync_type: 'batch',
      sync_direction: 'sheet_to_db',
      status: 'failed',
      error_type: 'unknown',
      error_message: sanitizedMessage,
      processing_duration_ms: duration
    })

    // Update quarterly sheet sync status
    await supabase
      .from('quarterly_sheets')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'failed',
        last_sync_error: error.message
      })
      .eq('id', quarterlySheetId)

    throw error
  }
}
