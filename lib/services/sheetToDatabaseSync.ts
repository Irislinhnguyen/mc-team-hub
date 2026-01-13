/**
 * Sheet to Database Sync Service (APPEND-ONLY MODE)
 *
 * Core sync algorithm for quarterly pipeline workflow:
 * - Fetches data from Google Sheets
 * - APPENDS ALL pipelines to database (no matching, no updates, no deletes)
 * - Each quarterly sheet is independent
 * - Proposal dates are preserved to track pipeline lifecycle across quarters
 *
 * This ensures that when users copy ongoing pipelines from previous quarters,
 * they are created as new records while maintaining the original proposal date.
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const { transformRowToPipeline, extractMonthlyForecasts } = require('@/scripts/lib/sheet-transformers.cjs')

// Supabase client with service role key (bypasses RLS)
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
 */
async function getGoogleSheetsClient() {
  const credentials = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'
  )

  if (!credentials.client_email) {
    throw new Error('Missing Google credentials')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  })

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
  const sheets = await getGoogleSheetsClient()

  // Build ranges for each row (A:CZ covers up to column 104)
  const ranges = rowNumbers.map(row => `${sheetName}!A${row}:CZ${row}`)

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER'
  })

  // Extract values from each range
  const rows = response.data.valueRanges
    ?.map(range => range.values && range.values.length > 0 ? range.values[0] : null)
    .filter(row => row !== null) || []

  // Sanitize rows to remove control characters
  return sanitizeRows(rows)
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
  fiscalYear: number
): PipelineRow[] {
  const pipelines: PipelineRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const sheetRowNumber = i + 3 // Row 3 is first data row

    // Skip empty rows (check if columns A, B, C are all empty)
    if (!row[0] && !row[1] && !row[2]) continue

    // Skip rows without key (Column A)
    if (!row[0] || row[0].toString().trim() === '') {
      console.warn(`Row ${sheetRowNumber}: Skipping - no key in Column A`)
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

      // Ensure key is set from Column A
      if (!sanitizedPipeline.key) {
        sanitizedPipeline.key = row[0].toString().trim()
      }

      pipelines.push(sanitizedPipeline)
    } catch (error: any) {
      console.error(`Row ${sheetRowNumber}: Failed to transform - ${error.message}`)
      continue
    }
  }

  return pipelines
}

/**
 * NOTE: hasChanges() and normalizeValue() removed in append-only mode
 * No comparison needed - all pipelines are created new
 */

/**
 * Main sync function: sync quarterly sheet to database (APPEND-ONLY MODE)
 * @param quarterlySheetId - ID of quarterly sheet record
 * @param userId - Optional: User ID of who triggered the sync
 * @param userEmail - Optional: Email of user who triggered the sync
 * @param changedRows - Optional array of row numbers for incremental sync (NOT USED in append-only, kept for compatibility)
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
    // Step 1: Fetch quarterly sheet config
    const { data: quarterlySheet, error: qsError } = await supabase
      .from('quarterly_sheets')
      .select('*')
      .eq('id', quarterlySheetId)
      .single()

    if (qsError || !quarterlySheet) {
      throw new Error(`Quarterly sheet not found: ${quarterlySheetId}`)
    }

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
      sheetRows = await fetchSpecificRows(
        sanitizedQuarterlySheet.spreadsheet_id,
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
      sanitizedQuarterlySheet.year
    )

    // CRITICAL FIX: Sanitize ALL sheet pipelines to remove control characters
    const sanitizedSheetPipelines = sheetPipelines.map(p => sanitizeObject(p))

    console.log(`[Sync] Parsed ${sanitizedSheetPipelines.length} valid pipelines (sanitized)`)

    // Step 4: APPEND-ONLY MODE - Create all pipelines, no matching, no updates, no deletes
    // Each quarterly sheet is independent - we just append everything from the sheet
    console.log('[Sync] 📝 APPEND-ONLY MODE: Creating all pipelines from sheet...')

    const toCreate = sanitizedSheetPipelines

    console.log(`[Sync] Ready to append ${toCreate.length} pipelines to database`)

    // Step 5: Execute insert operations (CREATE only)
    let createdCount = 0

    for (const pipeline of toCreate) {
      try {
        // Sanitize pipeline object before insert
        const sanitized = sanitizeObject(pipeline)
        const { error } = await supabase.from('pipelines').insert(sanitized)

        if (error) {
          errors.push(`Create failed for row ${pipeline.sheet_row_number} (${pipeline.key}): ${error.message}`)
        } else {
          createdCount++
          console.log(`[Sync] ✅ Created pipeline: ${pipeline.key} (row ${pipeline.sheet_row_number})`)
        }
      } catch (error: any) {
        errors.push(`Create failed for row ${pipeline.sheet_row_number} (${pipeline.key}): ${error.message}`)
      }
    }

    // Step 6: Log sync result
    const duration = Date.now() - startTime

    await supabase.from('pipeline_sync_log').insert({
      quarterly_sheet_id: quarterlySheetId,
      user_id: userId || null,
      user_email: userEmail || 'Webhook',
      sync_type: 'batch',
      sync_direction: 'sheet_to_db',
      target_sheet: sanitizedQuarterlySheet.sheet_name,
      status: errors.length > 0 ? 'partial' : 'success',
      rows_processed: sanitizedSheetPipelines.length,
      rows_created: createdCount,
      rows_updated: 0, // Append-only mode: no updates
      rows_deleted: 0, // Append-only mode: no deletes
      processing_duration_ms: duration
    })

    // Update quarterly sheet sync status
    await supabase
      .from('quarterly_sheets')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: errors.length > 0 ? 'partial' : 'success',
        last_sync_error: errors.length > 0
          ? errors.map(e => sanitizeCellValue(e)).join('; ')
          : null
      })
      .eq('id', quarterlySheetId)

    console.log(`[Sync] ✅ Append-only sync completed: ${createdCount} pipelines created in ${duration}ms`)

    return {
      success: errors.length === 0,
      total: sanitizedSheetPipelines.length,
      created: createdCount,
      updated: 0, // Append-only mode: no updates
      deleted: 0, // Append-only mode: no deletes
      errors,
      duration_ms: duration
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    // Log failure
    await supabase.from('pipeline_sync_log').insert({
      quarterly_sheet_id: quarterlySheetId,
      user_id: userId || null,
      user_email: userEmail || 'Webhook',
      sync_type: 'batch',
      sync_direction: 'sheet_to_db',
      status: 'failed',
      error_type: 'unknown',
      error_message: error.message,
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
