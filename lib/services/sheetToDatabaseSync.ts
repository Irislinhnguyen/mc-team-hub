/**
 * Sheet to Database Sync Service
 *
 * Core sync algorithm for quarterly pipeline workflow:
 * - Fetches data from Google Sheets
 * - Compares with database state
 * - Detects changes (NEW, UPDATE, DELETE)
 * - Executes batch operations in transaction
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
 * Generate composite key for pipeline matching
 * Uses: A (key) + B (classification) + C (poc) + I (domain) + O (description) + proposal_date
 * CRITICAL: Sanitize all parts to prevent JSON serialization errors
 */
function generateCompositeKey(pipeline: any): string {
  const parts = [
    sanitizeCellValue(pipeline.key || ''),
    sanitizeCellValue(pipeline.classification || ''),
    sanitizeCellValue(pipeline.poc || ''),
    sanitizeCellValue(pipeline.domain || ''),
    sanitizeCellValue(pipeline.description || ''),
    sanitizeCellValue(pipeline.proposal_date || '')
  ]
  return parts.join('|')
}

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

      // Add quarterly_sheet_id
      pipeline.quarterly_sheet_id = quarterlySheetId

      // Add sheet row number
      pipeline.sheet_row_number = sheetRowNumber

      // Ensure key is set from Column A
      if (!pipeline.key) {
        pipeline.key = row[0].toString().trim()
      }

      pipelines.push(pipeline)
    } catch (error: any) {
      console.error(`Row ${sheetRowNumber}: Failed to transform - ${error.message}`)
      continue
    }
  }

  return pipelines
}

/**
 * Compare two pipeline objects to detect changes
 */
function hasChanges(dbPipeline: any, sheetPipeline: any): boolean {
  for (const field of SYNCABLE_FIELDS) {
    const dbValue = normalizeValue(dbPipeline[field])
    const sheetValue = normalizeValue(sheetPipeline[field])

    if (dbValue !== sheetValue) {
      return true
    }
  }

  return false
}

/**
 * Normalize values for comparison
 */
function normalizeValue(value: any): any {
  // Null, undefined, empty string all become null
  if (value === null || value === undefined || value === '') return null

  // Trim strings AND remove control characters
  if (typeof value === 'string') return sanitizeCellValue(value.trim())

  // Handle dates (compare as ISO strings)
  if (value instanceof Date) return value.toISOString().split('T')[0]

  // Handle numbers (round to 4 decimal places)
  if (typeof value === 'number') return Math.round(value * 10000) / 10000

  return value
}

/**
 * Main sync function: sync quarterly sheet to database
 * @param quarterlySheetId - ID of quarterly sheet record
 * @param changedRows - Optional array of row numbers for incremental sync
 */
export async function syncQuarterlySheet(
  quarterlySheetId: string,
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
      // INCREMENTAL SYNC: Fetch only changed rows
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

    // Step 4: Fetch current DB state for this quarter
    console.log('[Sync] Fetching existing pipelines from database...')
    const { data: dbPipelines, error: dbError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('quarterly_sheet_id', quarterlySheetId)

    if (dbError) throw dbError

    console.log('[Sync] Sanitizing database pipelines...')
    // Sanitize database response to remove control characters (CRITICAL FIX)
    const sanitizedPipelines = sanitizeDatabaseResponse(dbPipelines) || []

    console.log(`[Sync] Found ${sanitizedPipelines.length} pipelines in DB (sanitized)`)

    // Step 5: Build maps for comparison
    // PRIMARY: Map by row number (quarterly_sheet_id + row_number)
    // SECONDARY: Map by composite key for detecting moved pipelines
    const sheetByRow = new Map(
      sanitizedSheetPipelines.map((p) => [
        `${quarterlySheetId}-${p.sheet_row_number}`,
        p
      ])
    )

    const sheetByComposite = new Map(
      sanitizedSheetPipelines.map((p) => [
        generateCompositeKey(p),
        p
      ])
    )

    const dbByRow = new Map(
      sanitizedPipelines.map((p: any) => [
        `${quarterlySheetId}-${p.sheet_row_number}`,
        p
      ])
    )

    const dbByComposite = new Map(
      sanitizedPipelines.map((p: any) => [
        generateCompositeKey(p),
        p
      ])
    )

    // Step 6: Detect changes
    const toCreate: any[] = []
    const toUpdate: Array<{ id: string; changes: any; reason: string }> = []
    const toDelete: any[] = []
    const matched = new Set<string>() // Track matched DB pipelines

    // Find NEW and UPDATED (match by row number FIRST)
    for (const sheetPipeline of sanitizedSheetPipelines) {
      const rowKey = `${quarterlySheetId}-${sheetPipeline.sheet_row_number}`
      const compositeKey = generateCompositeKey(sheetPipeline)

      // Strategy 1: Match by row number (same position in sheet)
      let dbPipeline = dbByRow.get(rowKey)
      let matchReason = ''

      if (dbPipeline) {
        matchReason = 'row_number'
        matched.add(dbPipeline.id)

        // Check if composite key changed (key changed but same row)
        const dbCompositeKey = generateCompositeKey(dbPipeline)
        if (dbCompositeKey !== compositeKey) {
          console.log(
            `[Sync] Row ${sheetPipeline.sheet_row_number}: Key changed from "${dbCompositeKey}" to "${compositeKey}"`
          )
        }

        // Update if data changed
        if (hasChanges(dbPipeline, sheetPipeline)) {
          toUpdate.push({
            id: dbPipeline.id,
            changes: sheetPipeline,
            reason: 'row_number_match_with_changes'
          })
        }
      } else {
        // Strategy 2: Match by composite key (pipeline moved to different row)
        dbPipeline = dbByComposite.get(compositeKey)

        if (dbPipeline) {
          matchReason = 'composite_key'
          matched.add(dbPipeline.id)

          console.log(
            `[Sync] Pipeline moved: "${compositeKey}" from row ${dbPipeline.sheet_row_number} to row ${sheetPipeline.sheet_row_number}`
          )

          // Update with new row number and any data changes
          toUpdate.push({
            id: dbPipeline.id,
            changes: sheetPipeline,
            reason: 'composite_key_match_row_moved'
          })
        } else {
          // Strategy 3: No match - create new pipeline
          toCreate.push(sheetPipeline)
        }
      }
    }

    // Find DELETED (pipelines in DB but not in sheet)
    for (const dbPipeline of sanitizedPipelines) {
      if (!matched.has(dbPipeline.id)) {
        toDelete.push(dbPipeline)
      }
    }

    console.log(
      `[Sync] Changes detected: ${toCreate.length} create, ${toUpdate.length} update, ${toDelete.length} delete`
    )

    // Step 7: Execute operations
    let createdCount = 0
    let updatedCount = 0
    let deletedCount = 0

    // Create new pipelines
    if (toCreate.length > 0) {
      for (const pipeline of toCreate) {
        try {
          // Sanitize pipeline object before insert
          const sanitized = sanitizeObject(pipeline)
          const { error } = await supabase.from('pipelines').insert(sanitized)

          if (error) {
            errors.push(`Create failed for ${pipeline.key}: ${error.message}`)
          } else {
            createdCount++
          }
        } catch (error: any) {
          errors.push(`Create failed for ${pipeline.key}: ${error.message}`)
        }
      }
    }

    // Update existing pipelines
    if (toUpdate.length > 0) {
      for (const { id, changes } of toUpdate) {
        try {
          // Pick only syncable fields to update
          const updates: any = {}
          for (const field of SYNCABLE_FIELDS) {
            if (changes[field] !== undefined) {
              updates[field] = changes[field]
            }
          }

          // Sanitize updates before applying
          const sanitized = sanitizeObject(updates)

          const { error } = await supabase
            .from('pipelines')
            .update(sanitized)
            .eq('id', id)

          if (error) {
            errors.push(`Update failed for ${changes.key}: ${error.message}`)
          } else {
            updatedCount++
          }
        } catch (error: any) {
          errors.push(`Update failed for ${changes.key}: ${error.message}`)
        }
      }
    }

    // Delete removed pipelines (move to deleted_pipelines)
    if (toDelete.length > 0) {
      for (const pipeline of toDelete) {
        try {
          // Fetch monthly forecasts
          const { data: forecasts } = await supabase
            .from('pipeline_monthly_forecast')
            .select('*')
            .eq('pipeline_id', pipeline.id)

          // Sanitize forecasts (may contain control characters from DB)
          const sanitizedForecasts = sanitizeDatabaseResponse(forecasts) || []

          // Insert into deleted_pipelines
          const deletedRecord = sanitizeObject({
            ...pipeline,
            original_created_at: pipeline.created_at,
            original_updated_at: pipeline.updated_at,
            deleted_at: new Date().toISOString(),
            deletion_reason: 'removed_from_sheet',
            deletion_source: 'webhook_sync',
            quarterly_sheet_reference: quarterlySheetId,
            monthly_forecasts_snapshot: sanitizedForecasts
          })
          await supabase.from('deleted_pipelines').insert(deletedRecord)

          // Delete from pipelines
          const { error } = await supabase
            .from('pipelines')
            .delete()
            .eq('id', pipeline.id)

          if (error) {
            errors.push(`Delete failed for ${pipeline.key}: ${error.message}`)
          } else {
            deletedCount++
          }
        } catch (error: any) {
          errors.push(`Delete failed for ${pipeline.key}: ${error.message}`)
        }
      }
    }

    // Step 8: Log sync result
    const duration = Date.now() - startTime

    await supabase.from('pipeline_sync_log').insert({
      quarterly_sheet_id: quarterlySheetId,
      sync_type: 'batch',
      sync_direction: 'sheet_to_db',
      target_sheet: sanitizedQuarterlySheet.sheet_name,
      status: errors.length > 0 ? 'partial' : 'success',
      rows_processed: sanitizedSheetPipelines.length,
      rows_created: createdCount,
      rows_updated: updatedCount,
      rows_deleted: deletedCount,
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

    return {
      success: errors.length === 0,
      total: sanitizedSheetPipelines.length,
      created: createdCount,
      updated: updatedCount,
      deleted: deletedCount,
      errors,
      duration_ms: duration
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    // Log failure
    await supabase.from('pipeline_sync_log').insert({
      quarterly_sheet_id: quarterlySheetId,
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
