/**
 * Data Transformation Utilities for Google Sheets Import
 *
 * Handles parsing, validation, and transformation of sheet data
 *
 * NOTE: Sales and CS sheets have different column mappings!
 * - Column mapping constants are imported from sheetToDatabaseSync.ts
 */

import type { QuarterlySheet } from './sheetToDatabaseSync'

// Import column mapping constants from sheetToDatabaseSync
// These are inlined to avoid .cjs require issues in Vercel production
import {
  COLUMN_MAPPING_CS,
  MONTHLY_COLUMNS_CS,
  VALID_STATUSES_CS,
  DEFAULT_VALUES_CS,
  COLUMN_MAPPING_SALES,
  MONTHLY_COLUMNS_SALES,
  VALID_STATUSES_SALES,
  DEFAULT_VALUES_SALES
} from './sheetToDatabaseSync'

/**
 * Parse decimal/numeric values from sheet cells
 * Handles comma-formatted numbers, percentages, etc.
 */
function parseDecimal(value: any): number | null {
  // IMPORTANT: 0 is a valid value! Only skip null/undefined/empty string
  if (value === null || value === undefined || value === '') return null

  // Remove commas and convert to string
  const cleaned = value.toString().replace(/,/g, '').trim()

  // Handle percentage format (e.g., "80%" -> 80)
  if (cleaned.endsWith('%')) {
    const num = parseFloat(cleaned.replace('%', ''))
    return isNaN(num) ? null : num
  }

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

/**
 * Parse integer values
 */
function parseInteger(value: any): number | null {
  // IMPORTANT: 0 is a valid value! Only skip null/undefined/empty string
  if (value === null || value === undefined || value === '') return null

  const cleaned = value.toString().replace(/,/g, '').trim()
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

/**
 * Parse date values from various formats
 * Handles: Excel dates, ISO dates, Japanese dates, etc.
 */
function parseDate(value: any): string | null {
  if (value === null || value === undefined || value === '') return null

  // If already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString().split('T')[0]
  }

  // Handle Excel serial date numbers FIRST (they come as raw numbers from API)
  // Valid Excel serial dates are 1 (1900-01-01) to ~50000 (year 2037)
  if (typeof value === 'number' && value > 0 && value < 100000) {
    const excelEpoch = new Date(1899, 11, 30)  // Excel's epoch is actually Dec 30, 1899
    const days = Math.floor(value)
    const resultDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
    if (!isNaN(resultDate.getTime()) && resultDate.getFullYear() > 1900 && resultDate.getFullYear() < 2100) {
      return resultDate.toISOString().split('T')[0]
    }
  }

  // Try parsing as string
  const str = value.toString().trim()
  if (!str) return null

  // Try standard date parsing
  const date = new Date(str)
  if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
    return date.toISOString().split('T')[0]
  }

  return null
}

/**
 * Parse boolean/validation flags
 */
function parseBoolean(value: any): boolean | null {
  if (value === true || value === 'TRUE' || value === '1' || value === 1) {
    return true
  }
  if (value === false || value === 'FALSE' || value === '0' || value === 0) {
    return false
  }
  return null
}

/**
 * Validate row has minimum required columns
 *
 * @param row - Row data from Google Sheets
 * @param group - Pipeline group: 'sales' or 'cs'
 * @returns Validation result with valid flag and optional error message
 */
export function validateRowStructure(
  row: any[],
  group: 'sales' | 'cs'
): { valid: boolean; error?: string } {
  // Sales needs at least 95 columns (due to C+↑ at col 35)
  // CS needs at least 94 columns
  const minColumns = group === 'sales' ? 95 : 94

  if (row.length < minColumns) {
    return {
      valid: false,
      error: `Row has only ${row.length} columns, expected at least ${minColumns}`
    }
  }

  return { valid: true }
}

/**
 * Transform a sheet row to a pipeline object
 *
 * @param row - Row data from Google Sheets
 * @param userId - User ID creating/updating the pipeline
 * @param group - Pipeline group: 'sales' or 'cs'
 * @param fiscalYear - Fiscal year (default 2025)
 * @returns Transformed pipeline object
 */
export function transformRowToPipeline(
  row: any[],
  userId: string,
  group: 'sales' | 'cs',
  fiscalYear = 2025
): any {
  // Use imported constants based on group
  const COLUMN_MAPPING = group === 'cs' ? COLUMN_MAPPING_CS : COLUMN_MAPPING_SALES
  const MONTHLY_COLUMNS = group === 'cs' ? MONTHLY_COLUMNS_CS : MONTHLY_COLUMNS_SALES
  const VALID_STATUSES = group === 'cs' ? VALID_STATUSES_CS : VALID_STATUSES_SALES
  const DEFAULT_VALUES = group === 'cs' ? DEFAULT_VALUES_CS : DEFAULT_VALUES_SALES

  const pipeline: any = {
    user_id: userId,
    group: group,
    fiscal_year: fiscalYear,
    fiscal_quarter: null, // Full year
    created_by: userId,
    updated_by: userId,
    ...DEFAULT_VALUES
  }

  // Apply column mappings
  for (const [colIndex, config] of Object.entries(COLUMN_MAPPING)) {
    const value = row[parseInt(colIndex)]
    const fieldName = (config as any).field

    // Skip if no value and not required (but 0 is a valid value!)
    if ((value === null || value === undefined || value === '') && !(config as any).required) {
      if ((config as any).default !== undefined) {
        pipeline[fieldName] = (config as any).default
      }
      continue
    }

    // Apply type conversion
    switch ((config as any).type) {
      case 'string':
        pipeline[fieldName] = value ? value.toString().trim() : ((config as any).default || null)
        break

      case 'decimal':
        pipeline[fieldName] = parseDecimal(value)
        break

      case 'integer':
        pipeline[fieldName] = parseInteger(value)
        break

      case 'bigint':
        pipeline[fieldName] = parseInteger(value)
        break

      case 'date':
        pipeline[fieldName] = parseDate(value)
        break

      default:
        pipeline[fieldName] = value || null
    }
  }

  // Ensure required fields have values
  // Use domain as publisher if publisher is empty
  if (!pipeline.publisher || pipeline.publisher.trim() === '') {
    pipeline.publisher = pipeline.domain || 'Unknown Publisher'
  }

  if (!pipeline.poc || pipeline.poc.trim() === '') {
    pipeline.poc = 'Unknown'
  }

  // Auto-generate name from publisher if not provided
  pipeline.name = pipeline.publisher || 'Unnamed Pipeline'
  pipeline.description = null

  // Validate and normalize status
  if (pipeline.status && !VALID_STATUSES.includes(pipeline.status)) {
    console.warn(`   ⚠️  Invalid status "${pipeline.status}", using default`)
    pipeline.status = DEFAULT_VALUES.status
  }

  // Ensure progress_percent is in valid range
  if (pipeline.progress_percent !== null) {
    if (pipeline.progress_percent < 0) pipeline.progress_percent = 0
    if (pipeline.progress_percent > 100) pipeline.progress_percent = 100
  }

  // Handle group-specific columns
  // Both CS and Sales have:
  //   - ZID at column 9 (J)
  //   - ready_to_deliver_date at 33 (AH)
  //   - closed_date at 34 (AI)
  // Sales-specific: C+↑ at 35 (AJ)
  // CS-specific: NO c_plus_upgrade
  if (group === 'sales') {
    pipeline.zid = row[9] ? row[9].toString().trim() : null   // J: ZID
    pipeline.ready_to_deliver_date = parseDate(row[33])       // AH: 【A】
    pipeline.closed_date = parseDate(row[34])                 // AI: 【Z】
    pipeline.c_plus_upgrade = row[35] ? row[35].toString().trim() : null  // AJ: C+↑
  } else {
    // CS: Same ZID and status transition dates
    pipeline.zid = row[9] ? row[9].toString().trim() : null   // J: ZID
    pipeline.ready_to_deliver_date = parseDate(row[33])       // AH: 【A】
    pipeline.closed_date = parseDate(row[34])                 // AI: 【Z】
    // CS doesn't have c_plus_upgrade
    pipeline.c_plus_upgrade = null
  }

  // Region field handling
  // Neither CS nor Sales sheets have region column anymore
  // Ensure region is NULL for both groups
  pipeline.region = null

  // IMPORTANT: Populate affected_zones from zid for Impact calculations
  // Impact API uses affected_zones array, not zid string directly
  // This connects Google Sheet ZID data to Impact calculations
  if (pipeline.zid && (!pipeline.affected_zones || pipeline.affected_zones.length === 0)) {
    pipeline.affected_zones = [pipeline.zid]
  }

  // Extract additional fields and quarterly breakdown into metadata
  // These fields don't have dedicated database columns but are useful for reporting

  // Quarterly breakdown: Sales has +1 offset due to C+↑ column at 35
  // CS: quarterly_breakdown at 37-48 (AL-AW)
  // Sales: q_gross/q_net_rev at 36-37, quarterly_breakdown at 38-49 (AM-AX)
  const quarterlyOffset = group === 'sales' ? 1 : 0

  pipeline.metadata = {
    ...pipeline.metadata,

    // NEW FIELDS from updated sheet structure
    ma_mi: row[4] ? row[4].toString().trim() : null,              // E: MA/MI
    pipeline_quarter: row[12] ? row[12].toString().trim() : null, // M: Pipeline Quarter
    estimation_logic: row[21] ? row[21].toString().trim() : null, // V: logic of Estimation
    update_target: row[26] ? row[26].toString().trim() : null,    // AA: Update Target

    // Note: c_plus_upgrade is now a direct field (not just metadata)
    // It's set above in the group-specific handling

    // Summary columns (computed in Google Sheets)
    estimate_total: parseDecimal(row[95]),           // CR: Estimate
    out_of_estimate_total: parseDecimal(row[96]),    // CS: Out of estimate
    max_total: parseDecimal(row[97]),                // CT: Max
    report_text: row[98] ? row[98].toString() : null, // CU: Report
    masaya_check: parseBoolean(row[100]),            // CW: Masaya Check

    // Quarterly breakdown from columns 37-48 (CS) or 38-49 (Sales, +1 offset due to C+↑)
    quarterly_breakdown: {
      gross: {
        first_month: parseDecimal(row[37 + quarterlyOffset]),    // AL (CS) / AM (Sales): Q粗利 初月
        middle_month: parseDecimal(row[38 + quarterlyOffset]),   // AM (CS) / AN (Sales): Q粗利 中月
        last_month: parseDecimal(row[39 + quarterlyOffset])      // AN (CS) / AO (Sales): Q粗利 終月
      },
      net: {
        first_month: parseDecimal(row[40 + quarterlyOffset]),    // AO (CS) / AP (Sales): Q純収益 初月
        middle_month: parseDecimal(row[41 + quarterlyOffset]),   // AP (CS) / AQ (Sales): Q純収益 中月
        last_month: parseDecimal(row[42 + quarterlyOffset])      // AQ (CS) / AR (Sales): Q純収益 終月
      },
      max_gross: {
        first_month: parseDecimal(row[43 + quarterlyOffset]),    // AR (CS) / AS (Sales): Q最大粗利 初月
        middle_month: parseDecimal(row[44 + quarterlyOffset]),   // AS (CS) / AT (Sales): Q最大粗利 中月
        last_month: parseDecimal(row[45 + quarterlyOffset])      // AT (CS) / AU (Sales): Q最大粗利 終月
      },
      max_net: {
        first_month: parseDecimal(row[46 + quarterlyOffset]),    // AU (CS) / AV (Sales): Q最大純収益 初月
        middle_month: parseDecimal(row[47 + quarterlyOffset]),   // AV (CS) / AW (Sales): Q最大純収益 中月
        last_month: parseDecimal(row[48 + quarterlyOffset])      // AW (CS) / AX (Sales): Q最大純収益 終月
      }
    }
  }

  return pipeline
}

/**
 * Extract monthly forecasts from a row
 * Returns array of forecast objects
 *
 * @param row - Row data from Google Sheets
 * @param pipelineId - Pipeline ID to associate forecasts with
 * @param startYear - Starting year for forecast (default 2025)
 * @param group - Pipeline group (sales/cs) for loading correct mapping
 * @returns Array of monthly forecast objects
 */
export function extractMonthlyForecasts(
  row: any[],
  pipelineId: string,
  startYear = 2025,
  group: 'sales' | 'cs' = 'sales'
): any[] {
  // Load MONTHLY_COLUMNS from appropriate mapping
  const MONTHLY_COLUMNS = group === 'cs' ? MONTHLY_COLUMNS_CS : MONTHLY_COLUMNS_SALES

  const forecasts: any[] = []

  // Process 15 months of data
  for (let i = 0; i < MONTHLY_COLUMNS.endDates.count; i++) {
    // Calculate year and month
    let year = startYear
    let month = i + 1 // Months 1-15

    // Handle months > 12 (roll into next year)
    if (month > 12) {
      year++
      month = month - 12
    }

    // Extract data from columns
    const endDateValue = row[MONTHLY_COLUMNS.endDates.start + i]
    const deliveryDaysValue = row[MONTHLY_COLUMNS.deliveryDays.start + i]
    const validationValue = row[MONTHLY_COLUMNS.validation.start + i]

    const endDate = parseDate(endDateValue)
    const deliveryDays = parseInteger(deliveryDaysValue)
    const validationFlag = parseBoolean(validationValue)

    // Only create forecast if there's meaningful data
    if (endDate || deliveryDays !== null || validationFlag !== null) {
      forecasts.push({
        pipeline_id: pipelineId,
        year,
        month,
        end_date: endDate,
        delivery_days: deliveryDays,
        validation_flag: validationFlag,
        gross_revenue: null, // TODO: Extract from revenue breakdown columns if available
        net_revenue: null,
        notes: null
      })
    }
  }

  return forecasts
}

/**
 * Validate a pipeline object before insertion
 * Returns array of validation errors
 *
 * @param pipeline - Pipeline object to validate
 * @param rowNumber - Row number in sheet (for error reporting)
 * @returns Array of validation error messages
 */
export function validatePipeline(pipeline: any, rowNumber: number): string[] {
  // Load VALID_STATUSES based on group
  const VALID_STATUSES = pipeline.group === 'cs' ? VALID_STATUSES_CS : VALID_STATUSES_SALES

  const errors: string[] = []

  // Required fields
  if (!pipeline.publisher || pipeline.publisher.trim() === '') {
    errors.push(`Row ${rowNumber}: Publisher is required`)
  }

  if (!pipeline.poc || pipeline.poc.trim() === '') {
    errors.push(`Row ${rowNumber}: POC is required`)
  }

  if (!pipeline.group || !['sales', 'cs'].includes(pipeline.group)) {
    errors.push(`Row ${rowNumber}: Valid group (sales/cs) is required`)
  }

  // Valid status
  if (pipeline.status && !VALID_STATUSES.includes(pipeline.status)) {
    errors.push(`Row ${rowNumber}: Invalid status "${pipeline.status}"`)
  }

  // Progress percent range
  if (pipeline.progress_percent !== null && (pipeline.progress_percent < 0 || pipeline.progress_percent > 100)) {
    errors.push(`Row ${rowNumber}: Progress must be 0-100, got ${pipeline.progress_percent}`)
  }

  // Numeric field validations
  if (pipeline.revenue_share !== null && (pipeline.revenue_share < 0 || pipeline.revenue_share > 100)) {
    errors.push(`Row ${rowNumber}: Revenue share must be 0-100, got ${pipeline.revenue_share}`)
  }

  return errors
}

/**
 * Create a summary of transformation results
 */
export function createTransformationSummary(results: any[]): any {
  const summary = {
    totalRows: results.length,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    errors: []
  }

  results.forEach((result) => {
    if (result.success) {
      summary.successCount++
    } else if (result.skipped) {
      summary.skippedCount++
    } else {
      summary.errorCount++
      summary.errors.push(result.error)
    }
  })

  return summary
}
