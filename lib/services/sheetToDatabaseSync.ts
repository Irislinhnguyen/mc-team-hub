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

  // Skip header rows (rows 1-2 are headers, data starts at row 3)
  return rows.slice(2)
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

    // Skip empty rows (check if columns A, B, C are all empty)
    if (!row[0] && !row[1] && !row[2]) continue

    // Skip rows without key (Column A)
    if (!row[0] || row[0].toString().trim() === '') {
      console.warn(`Row ${i + 3}: Skipping - no key in Column A`)
      continue
    }

    try {
      // Transform row using existing transformer
      const pipeline = transformRowToPipeline(row, userId, group, fiscalYear)

      // Add quarterly_sheet_id
      pipeline.quarterly_sheet_id = quarterlySheetId

      // Ensure key is set from Column A
      if (!pipeline.key) {
        pipeline.key = row[0].toString().trim()
      }

      pipelines.push(pipeline)
    } catch (error: any) {
      console.error(`Row ${i + 3}: Failed to transform - ${error.message}`)
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

  // Trim strings
  if (typeof value === 'string') return value.trim()

  // Handle dates (compare as ISO strings)
  if (value instanceof Date) return value.toISOString().split('T')[0]

  // Handle numbers (round to 4 decimal places)
  if (typeof value === 'number') return Math.round(value * 10000) / 10000

  return value
}

/**
 * Main sync function: sync quarterly sheet to database
 */
export async function syncQuarterlySheet(
  quarterlySheetId: string
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

    if (quarterlySheet.sync_status !== 'active') {
      throw new Error(`Sync is paused for sheet: ${quarterlySheet.sheet_name}`)
    }

    // Step 2: Fetch sheet data from Google Sheets
    console.log(`[Sync] Fetching data from ${quarterlySheet.sheet_name}...`)
    const sheetRows = await fetchSheetData(
      quarterlySheet.spreadsheet_id,
      quarterlySheet.sheet_name
    )

    console.log(`[Sync] Found ${sheetRows.length} rows in sheet`)

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
      quarterlySheet.group,
      quarterlySheetId,
      quarterlySheet.year
    )

    console.log(`[Sync] Parsed ${sheetPipelines.length} valid pipelines`)

    // Step 4: Fetch current DB state for this quarter
    const { data: dbPipelines, error: dbError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('quarterly_sheet_id', quarterlySheetId)

    if (dbError) throw dbError

    console.log(`[Sync] Found ${dbPipelines?.length || 0} pipelines in DB`)

    // Step 5: Build maps for comparison (composite key: "key-proposal_date")
    const sheetMap = new Map(
      sheetPipelines.map((p) => [
        `${p.key}-${p.proposal_date}`,
        p
      ])
    )

    const dbMap = new Map(
      (dbPipelines || []).map((p: any) => [
        `${p.key}-${p.proposal_date}`,
        p
      ])
    )

    // Step 6: Detect changes
    const toCreate: any[] = []
    const toUpdate: Array<{ id: string; changes: any }> = []
    const toDelete: any[] = []

    // Find NEW and UPDATED
    for (const [compositeKey, sheetPipeline] of sheetMap) {
      const dbPipeline = dbMap.get(compositeKey)

      if (!dbPipeline) {
        toCreate.push(sheetPipeline)
      } else if (hasChanges(dbPipeline, sheetPipeline)) {
        toUpdate.push({
          id: dbPipeline.id,
          changes: sheetPipeline
        })
      }
    }

    // Find DELETED
    for (const [compositeKey, dbPipeline] of dbMap) {
      if (!sheetMap.has(compositeKey)) {
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
          const { error } = await supabase.from('pipelines').insert(pipeline)

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

          const { error } = await supabase
            .from('pipelines')
            .update(updates)
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

          // Insert into deleted_pipelines
          await supabase.from('deleted_pipelines').insert({
            ...pipeline,
            original_created_at: pipeline.created_at,
            original_updated_at: pipeline.updated_at,
            deleted_at: new Date().toISOString(),
            deletion_reason: 'removed_from_sheet',
            deletion_source: 'webhook_sync',
            quarterly_sheet_reference: quarterlySheetId,
            monthly_forecasts_snapshot: forecasts || []
          })

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
      target_sheet: quarterlySheet.sheet_name,
      status: errors.length > 0 ? 'partial' : 'success',
      rows_processed: sheetPipelines.length,
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
        last_sync_error: errors.length > 0 ? errors.join('; ') : null
      })
      .eq('id', quarterlySheetId)

    return {
      success: errors.length === 0,
      total: sheetPipelines.length,
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
