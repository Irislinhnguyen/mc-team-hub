/**
 * Data Transformation Utilities for Google Sheets Import
 *
 * Handles parsing, validation, and transformation of sheet data
 *
 * NOTE: Sales and CS sheets have different column mappings!
 * - Use pipeline-column-mapping.cjs for Sales
 * - Use pipeline-column-mapping-cs.cjs for CS
 */

// NOTE: COLUMN_MAPPING is now loaded dynamically based on group
// See transformRowToPipeline() function

/**
 * Parse decimal/numeric values from sheet cells
 * Handles comma-formatted numbers, percentages, etc.
 */
function parseDecimal(value) {
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
function parseInteger(value) {
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
function parseDate(value) {
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
function parseBoolean(value) {
  if (value === true || value === 'TRUE' || value === '1' || value === 1) {
    return true
  }
  if (value === false || value === 'FALSE' || value === '0' || value === 0) {
    return false
  }
  return null
}

/**
 * Transform a sheet row to a pipeline object
 *
 * @param {Array} row - Row data from Google Sheets
 * @param {string} userId - User ID creating/updating the pipeline
 * @param {string} group - Pipeline group: 'sales' or 'cs'
 * @param {number} fiscalYear - Fiscal year (default 2025)
 * @returns {Object} Transformed pipeline object
 */
function transformRowToPipeline(row, userId, group, fiscalYear = 2025) {
  // ⚠️ Load mapping based on group (Sales vs CS)
  const mappingFile = group === 'cs'
    ? './pipeline-column-mapping-cs.cjs'
    : './pipeline-column-mapping.cjs'  // Sales

  const { COLUMN_MAPPING, MONTHLY_COLUMNS, VALID_STATUSES, DEFAULT_VALUES } = require(mappingFile)

  const pipeline = {
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
    const fieldName = config.field

    // Skip if no value and not required (but 0 is a valid value!)
    if ((value === null || value === undefined || value === '') && !config.required) {
      if (config.default !== undefined) {
        pipeline[fieldName] = config.default
      }
      continue
    }

    // Apply type conversion
    switch (config.type) {
      case 'string':
        pipeline[fieldName] = value ? value.toString().trim() : (config.default || null)
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

  // Handle ZID field (Sales only - column 33/AH)
  // CS sheet uses column 33 for ready_to_deliver_date instead
  if (group === 'sales') {
    pipeline.zid = row[33] ? row[33].toString().trim() : null  // AH: ZID
  } else {
    // CS doesn't have ZID column
    pipeline.zid = null
  }

  // Extract additional fields and quarterly breakdown into metadata
  // These fields don't have dedicated database columns but are useful for reporting
  pipeline.metadata = {
    ...pipeline.metadata,

    // NEW FIELDS from updated sheet structure
    ma_mi: row[4] ? row[4].toString().trim() : null,              // E: MA/MI
    pipeline_quarter: row[12] ? row[12].toString().trim() : null, // M: Pipeline Quarter
    estimation_logic: row[21] ? row[21].toString().trim() : null, // V: logic of Estimation
    update_target: row[26] ? row[26].toString().trim() : null,    // AA: Update Target

    // C+↑ field (Sales only - column 34/AI)
    // CS uses column 34 for closed_date instead
    c_plus_upgrade: (group === 'sales' && row[34]) ? row[34].toString().trim() : null,

    // Summary columns (computed in Google Sheets)
    estimate_total: parseDecimal(row[95]),           // CR: Estimate
    out_of_estimate_total: parseDecimal(row[96]),    // CS: Out of estimate
    max_total: parseDecimal(row[97]),                // CT: Max
    report_text: row[98] ? row[98].toString() : null, // CU: Report
    masaya_check: parseBoolean(row[100]),            // CW: Masaya Check

    // Quarterly breakdown from columns 37-48 (same for both Sales and CS)
    quarterly_breakdown: {
      gross: {
        first_month: parseDecimal(row[37]),    // AL: Q粗利 初月
        middle_month: parseDecimal(row[38]),   // AM: Q粗利 中月
        last_month: parseDecimal(row[39])      // AN: Q粗利 終月
      },
      net: {
        first_month: parseDecimal(row[40]),    // AO: Q純収益 初月
        middle_month: parseDecimal(row[41]),   // AP: Q純収益 中月
        last_month: parseDecimal(row[42])      // AQ: Q純収益 終月
      },
      max_gross: {
        first_month: parseDecimal(row[43]),    // AR: Q最大粗利 初月
        middle_month: parseDecimal(row[44]),   // AS: Q最大粗利 中月
        last_month: parseDecimal(row[45])      // AT: Q最大粗利 終月
      },
      max_net: {
        first_month: parseDecimal(row[46]),    // AU: Q最大純収益 初月
        middle_month: parseDecimal(row[47]),   // AV: Q最大純収益 中月
        last_month: parseDecimal(row[48])      // AW: Q最大純収益 終月
      }
    }
  }

  return pipeline
}

/**
 * Extract monthly forecasts from a row
 * Returns array of forecast objects
 *
 * @param {Array} row - Row data from Google Sheets
 * @param {string} pipelineId - Pipeline ID to associate forecasts with
 * @param {number} startYear - Starting year for forecast (default 2025)
 * @param {string} group - Pipeline group (sales/cs) for loading correct mapping
 * @returns {Array} Array of monthly forecast objects
 */
function extractMonthlyForecasts(row, pipelineId, startYear = 2025, group = 'sales') {
  // Load MONTHLY_COLUMNS from appropriate mapping file
  const mappingFile = group === 'cs'
    ? './pipeline-column-mapping-cs.cjs'
    : './pipeline-column-mapping.cjs'

  const { MONTHLY_COLUMNS } = require(mappingFile)

  const forecasts = []

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
 * @param {Object} pipeline - Pipeline object to validate
 * @param {number} rowNumber - Row number in sheet (for error reporting)
 * @returns {Array} Array of validation error messages
 */
function validatePipeline(pipeline, rowNumber) {
  // Load VALID_STATUSES from appropriate mapping file
  const mappingFile = pipeline.group === 'cs'
    ? './pipeline-column-mapping-cs.cjs'
    : './pipeline-column-mapping.cjs'

  const { VALID_STATUSES } = require(mappingFile)

  const errors = []

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
function createTransformationSummary(results) {
  const summary = {
    totalRows: results.length,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    errors: []
  }

  results.forEach(result => {
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

module.exports = {
  parseDecimal,
  parseInteger,
  parseDate,
  parseBoolean,
  transformRowToPipeline,
  extractMonthlyForecasts,
  validatePipeline,
  createTransformationSummary,
  // Legacy aliases for backwards compatibility
  transformRowToDeal: transformRowToPipeline,
  validateDeal: validatePipeline
}
