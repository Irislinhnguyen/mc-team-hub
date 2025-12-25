/**
 * Pipeline to Google Sheets Sync Service
 *
 * Real-time one-way synchronization from Pipeline database to Google Sheets
 * Syncs on create/update operations for team collaboration
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import type { Pipeline } from '@/lib/types/pipeline'
import {
  SPREADSHEET_CONFIG,
  SHEET_COLUMN_MAPPING,
  getTargetSheet,
  getSyncableFields,
  columnIndexToLetter,
} from '@/lib/config/pipelineSheetMapping'
import { formatValue } from '@/lib/utils/sheetFormatters'
import { getSheetsClient } from '@/lib/services/googleSheetsClient'

// =====================================================
// TYPES
// =====================================================

export interface SyncResult {
  success: boolean
  rowNumber?: number
  error?: string
  errorType?: 'permission_denied' | 'sheet_not_found' | 'rate_limit' | 'network_error' | 'unknown'
}

// =====================================================
// MAIN SYNC FUNCTION
// =====================================================

/**
 * Sync a pipeline to Google Sheets
 * This is the main entry point called by API routes
 *
 * @param pipeline - Pipeline object to sync
 * @returns SyncResult with success status and row number
 */
export async function syncPipelineToSheet(pipeline: Pipeline): Promise<SyncResult> {
  // Check if sync is enabled
  const syncEnabled = process.env.PIPELINE_SYNC_ENABLED === 'true'
  if (!syncEnabled) {
    console.log('[Pipeline Sync] Sync disabled via environment variable')
    return { success: true } // Don't fail, just skip
  }

  const startTime = Date.now()
  console.log(`[Pipeline Sync] Starting sync for pipeline ${pipeline.id} (${pipeline.publisher})`)

  try {
    // 1. Determine target sheet
    const sheetName = getTargetSheet(pipeline.group)
    console.log(`[Pipeline Sync] Target sheet: ${sheetName}`)

    // 2. Initialize Google Sheets client using centralized service
    const auth = getSheetsClient(['https://www.googleapis.com/auth/spreadsheets'])
    const sheets = google.sheets({ version: 'v4', auth })

    // 3. Find existing row (if any)
    const existingRow = await findExistingRow(sheets, pipeline, sheetName)

    // 4. Map pipeline to sheet row
    const rowData = mapPipelineToSheetRow(pipeline)

    // 5. Update or create row
    let rowNumber: number
    if (existingRow) {
      console.log(`[Pipeline Sync] Updating existing row ${existingRow.rowNumber}`)
      await updateSheetRow(sheets, sheetName, existingRow.rowNumber, rowData)
      rowNumber = existingRow.rowNumber
    } else {
      console.log('[Pipeline Sync] Creating new row')
      rowNumber = await createSheetRow(sheets, sheetName, rowData)
    }

    // 6. Log success to database
    await logSyncAttempt(pipeline.id, {
      sync_type: existingRow ? 'update' : 'create',
      target_sheet: sheetName,
      status: 'success',
      row_number: rowNumber,
    })

    const duration = Date.now() - startTime
    console.log(`[Pipeline Sync] ✅ Success in ${duration}ms - Row ${rowNumber}`)

    return {
      success: true,
      rowNumber,
    }
  } catch (error: any) {
    console.error('[Pipeline Sync] ❌ Error:', error)

    // Classify error type
    let errorType: SyncResult['errorType'] = 'unknown'
    let errorMessage = error.message || 'Unknown error'

    if (error.code === 403 || errorMessage.includes('permission')) {
      errorType = 'permission_denied'
      errorMessage = 'Sheet not shared with service account'
    } else if (error.code === 404) {
      errorType = 'sheet_not_found'
      errorMessage = 'Spreadsheet or sheet not found'
    } else if (error.code === 429) {
      errorType = 'rate_limit'
      errorMessage = 'Google API rate limit exceeded'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      errorType = 'network_error'
    }

    // Log failure to database
    await logSyncAttempt(pipeline.id, {
      sync_type: 'update', // Assume update for error logging
      target_sheet: getTargetSheet(pipeline.group),
      status: 'failed',
      error_type: errorType,
      error_message: errorMessage,
    })

    const duration = Date.now() - startTime
    console.log(`[Pipeline Sync] ❌ Failed in ${duration}ms - ${errorType}: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage,
      errorType,
    }
  }
}

// =====================================================
// GOOGLE SHEETS OPERATIONS
// =====================================================

/**
 * Find existing row by Pipeline ID (UUID) match
 * Returns row number if found, null otherwise
 */
async function findExistingRow(
  sheets: any,
  pipeline: Pipeline,
  sheetName: string
): Promise<{ rowNumber: number } | null> {
  try {
    // Read Pipeline ID column (Column A)
    const range = `${sheetName}!A${SPREADSHEET_CONFIG.dataStartRow}:A`

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_CONFIG.spreadsheetId,
      range,
    })

    const rows = response.data.values || []

    // Search for matching Pipeline ID
    for (let i = 0; i < rows.length; i++) {
      const rowId = rows[i][0]?.trim() || '' // Column A

      // Exact match on Pipeline ID (UUID)
      if (rowId === pipeline.id) {
        const rowNumber = SPREADSHEET_CONFIG.dataStartRow + i
        console.log(`[Pipeline Sync] Found existing row: ${rowNumber} (ID: ${pipeline.id})`)
        return { rowNumber }
      }
    }

    console.log(`[Pipeline Sync] No existing row found for ID: ${pipeline.id}`)
    return null
  } catch (error: any) {
    console.warn('[Pipeline Sync] Error searching for existing row:', error.message)
    // If search fails, proceed to create new row
    return null
  }
}

/**
 * Map Pipeline fields to Google Sheets row array
 * Returns array with values at correct column indices
 */
function mapPipelineToSheetRow(pipeline: Pipeline): any[] {
  const syncableFields = getSyncableFields()
  const maxColumnIndex = Math.max(...Object.values(SHEET_COLUMN_MAPPING) as number[])

  // Initialize array with empty strings (Google Sheets prefers empty strings over null)
  const row = new Array(maxColumnIndex + 1).fill('')

  // Map each field to its column
  for (const fieldName of syncableFields) {
    const columnIndex = SHEET_COLUMN_MAPPING[fieldName]
    const value = (pipeline as any)[fieldName]
    const formattedValue = formatValue(value, fieldName)
    row[columnIndex] = formattedValue
  }

  return row
}

/**
 * Update existing row in Google Sheets
 * Updates only specific columns to preserve formulas in other columns
 */
async function updateSheetRow(
  sheets: any,
  sheetName: string,
  rowNumber: number,
  rowData: any[]
): Promise<void> {
  // Build batch update for each column separately
  // This prevents overwriting formula columns (B, Q, R, AK)
  const updates: any[] = []
  const syncableFields = getSyncableFields()

  for (const fieldName of syncableFields) {
    const columnIndex = SHEET_COLUMN_MAPPING[fieldName]
    const columnLetter = columnIndexToLetter(columnIndex)
    const value = rowData[columnIndex]

    // Add this cell to batch update
    updates.push({
      range: `${sheetName}!${columnLetter}${rowNumber}`,
      values: [[value]],
    })
  }

  // Execute batch update - all in one API call
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_CONFIG.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  })
}

/**
 * Create new row in Google Sheets
 * Finds first truly empty row by checking key columns (A, C, D, E)
 */
async function createSheetRow(
  sheets: any,
  sheetName: string,
  rowData: any[]
): Promise<number> {
  // Read from data start row (skip headers)
  const startRow = SPREADSHEET_CONFIG.dataStartRow
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_CONFIG.spreadsheetId,
    range: `${sheetName}!A${startRow}:AZ`, // Read from row 3 onwards
  })

  const rows = response.data.values || []
  let targetRow = 0

  // Find first row where column A (Pipeline ID) is empty
  // Column A never has formulas - only UUIDs or empty
  // This is the safest way to find truly empty rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || []
    const colA = row[0]?.toString().trim() || '' // Column A (index 0)

    // If A is empty, this row is available
    if (!colA) {
      targetRow = startRow + i
      console.log(`[Pipeline Sync] Found empty row at ${targetRow} (A empty)`)
      break
    }
  }

  // If no empty row found, append to end
  if (targetRow === 0) {
    targetRow = startRow + rows.length
    console.log(`[Pipeline Sync] No empty row found, appending to: ${targetRow}`)
  }

  // Insert into target row - update only specific columns to preserve formulas
  const updates: any[] = []
  const syncableFields = getSyncableFields()

  for (const fieldName of syncableFields) {
    const columnIndex = SHEET_COLUMN_MAPPING[fieldName]
    const columnLetter = columnIndexToLetter(columnIndex)
    const value = rowData[columnIndex]

    // Add this cell to batch update
    updates.push({
      range: `${sheetName}!${columnLetter}${targetRow}`,
      values: [[value]],
    })
  }

  // Execute batch update - preserves formulas in columns B, Q, R, AK
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_CONFIG.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  })

  return targetRow
}

/**
 * Delete a row from Google Sheets by Pipeline ID
 * Called when pipeline status changes to 【S】
 */
async function deleteSheetRowByPipelineId(
  sheets: any,
  sheetName: string,
  pipelineId: string
): Promise<{ deleted: boolean; rowNumber?: number }> {
  try {
    // 1. Read Pipeline ID column to find the row
    const range = `${sheetName}!A${SPREADSHEET_CONFIG.dataStartRow}:A`
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_CONFIG.spreadsheetId,
      range,
    })

    const rows = response.data.values || []
    let rowNumber: number | null = null

    // Find matching row
    for (let i = 0; i < rows.length; i++) {
      const rowId = rows[i][0]?.trim() || ''
      if (rowId === pipelineId) {
        rowNumber = SPREADSHEET_CONFIG.dataStartRow + i
        break
      }
    }

    if (!rowNumber) {
      console.log(`[Pipeline Sync] No row found for pipeline ${pipelineId} to delete`)
      return { deleted: false }
    }

    // 2. Get sheet ID (gid) for batchUpdate
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_CONFIG.spreadsheetId,
    })

    const sheet = spreadsheetInfo.data.sheets?.find(
      (s: any) => s.properties?.title === sheetName
    )

    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`)
    }

    const sheetId = sheet.properties?.sheetId

    // 3. Delete row using batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_CONFIG.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // 0-indexed
                endIndex: rowNumber, // exclusive
              },
            },
          },
        ],
      },
    })

    console.log(`[Pipeline Sync] Deleted row ${rowNumber} for pipeline ${pipelineId}`)
    return { deleted: true, rowNumber }
  } catch (error: any) {
    console.error('[Pipeline Sync] Error deleting row:', error.message)
    throw error
  }
}

/**
 * Delete a pipeline row from Google Sheets
 * Called when pipeline status changes to 【S】 (closed won)
 *
 * @param pipelineId - Pipeline UUID to delete
 * @param group - Pipeline group ('sales' | 'cs') to determine target sheet
 * @returns SyncResult with success status
 */
export async function deleteRowFromSheet(pipelineId: string, group: string | null): Promise<SyncResult> {
  // Check if sync is enabled
  const syncEnabled = process.env.PIPELINE_SYNC_ENABLED === 'true'
  if (!syncEnabled) {
    console.log('[Pipeline Sync] Sync disabled - skipping row deletion')
    return { success: true }
  }

  const startTime = Date.now()
  const sheetName = getTargetSheet(group)
  console.log(`[Pipeline Sync] Deleting row for pipeline ${pipelineId} from ${sheetName}`)

  try {
    // Initialize Google Sheets client
    const auth = getSheetsClient(['https://www.googleapis.com/auth/spreadsheets'])
    const sheets = google.sheets({ version: 'v4', auth })

    // Delete the row
    const result = await deleteSheetRowByPipelineId(sheets, sheetName, pipelineId)

    if (result.deleted) {
      // Log success
      await logSyncAttempt(pipelineId, {
        sync_type: 'delete',
        target_sheet: sheetName,
        status: 'success',
        row_number: result.rowNumber,
      })

      const duration = Date.now() - startTime
      console.log(`[Pipeline Sync] ✅ Row deleted in ${duration}ms`)

      return { success: true, rowNumber: result.rowNumber }
    } else {
      // Row not found - still success (nothing to delete)
      console.log('[Pipeline Sync] Row not found - nothing to delete')
      return { success: true }
    }
  } catch (error: any) {
    console.error('[Pipeline Sync] ❌ Delete error:', error)

    // Classify error
    let errorType: SyncResult['errorType'] = 'unknown'
    let errorMessage = error.message || 'Unknown error'

    if (error.code === 403) {
      errorType = 'permission_denied'
      errorMessage = 'Sheet not shared with service account'
    } else if (error.code === 404) {
      errorType = 'sheet_not_found'
    } else if (error.code === 429) {
      errorType = 'rate_limit'
    }

    // Log failure
    await logSyncAttempt(pipelineId, {
      sync_type: 'delete',
      target_sheet: sheetName,
      status: 'failed',
      error_type: errorType,
      error_message: errorMessage,
    })

    const duration = Date.now() - startTime
    console.log(`[Pipeline Sync] ❌ Delete failed in ${duration}ms - ${errorType}: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage,
      errorType,
    }
  }
}

// =====================================================
// DATABASE LOGGING
// =====================================================

interface LogSyncParams {
  sync_type: 'create' | 'update' | 'delete'
  target_sheet: string
  status: 'success' | 'failed'
  error_type?: string
  error_message?: string
  row_number?: number
}

/**
 * Log sync attempt to database for monitoring
 */
async function logSyncAttempt(pipelineId: string, params: LogSyncParams): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[Pipeline Sync] Supabase credentials not configured - skipping log')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const { error } = await supabase.from('pipeline_sync_log').insert({
      pipeline_id: pipelineId,
      sync_type: params.sync_type,
      target_sheet: params.target_sheet,
      status: params.status,
      error_type: params.error_type || null,
      error_message: params.error_message || null,
      row_number: params.row_number || null,
      synced_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[Pipeline Sync] Failed to log sync attempt:', error)
    }
  } catch (error) {
    console.error('[Pipeline Sync] Error logging sync attempt:', error)
    // Don't throw - logging failure shouldn't break the sync
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Retry wrapper with exponential backoff
 * Used internally for transient errors (rate limits, network issues)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry on permission errors or not found
      if (error.code === 403 || error.code === 404) {
        throw error
      }

      // Retry on rate limits and network errors
      if (attempt < maxRetries && (error.code === 429 || error.message?.includes('network'))) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[Pipeline Sync] Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }

  throw lastError
}

/**
 * Batch sync multiple pipelines (for backfilling)
 * Not used in real-time sync, but useful for admin operations
 */
export async function batchSyncPipelines(
  pipelines: Pipeline[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (let i = 0; i < pipelines.length; i++) {
    const pipeline = pipelines[i]

    try {
      const result = await syncPipelineToSheet(pipeline)
      if (result.success) {
        success++
      } else {
        failed++
      }
    } catch (error) {
      failed++
      console.error(`[Batch Sync] Failed to sync pipeline ${pipeline.id}:`, error)
    }

    if (onProgress) {
      onProgress(i + 1, pipelines.length)
    }

    // Rate limiting: Wait 100ms between requests
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { success, failed }
}
