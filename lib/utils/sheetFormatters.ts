/**
 * Data Formatters for Google Sheets Export
 *
 * Convert Pipeline database values to Google Sheets-compatible formats
 */

/**
 * Convert ISO date string to Excel serial number
 * Google Sheets stores dates as serial numbers (days since Dec 30, 1899)
 *
 * @param isoDate - ISO 8601 date string (e.g., '2025-01-15T00:00:00Z')
 * @returns Excel serial number or null
 *
 * @example
 * formatDateForSheet('2025-01-15') → 45676
 * formatDateForSheet(null) → null
 */
export function formatDateForSheet(isoDate: string | null): number | null {
  if (!isoDate) return null

  try {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return null

    // Excel epoch: December 30, 1899
    const excelEpoch = new Date(1899, 11, 30)
    const daysSinceEpoch = Math.floor(
      (date.getTime() - excelEpoch.getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysSinceEpoch
  } catch {
    return null
  }
}

/**
 * Format decimal number for sheets (round to 2 decimal places)
 *
 * @param value - Decimal value
 * @returns Rounded number or null
 *
 * @example
 * formatDecimal(1234.5678) → 1234.57
 * formatDecimal(null) → null
 */
export function formatDecimal(value: number | string | null): number | null {
  if (value === null || value === undefined || value === '') return null

  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null

  return Math.round(num * 100) / 100
}

/**
 * Format integer (for imp, progress_percent)
 *
 * @param value - Integer value or string
 * @returns Integer or null
 *
 * @example
 * formatInteger('123456') → 123456
 * formatInteger(null) → null
 */
export function formatInteger(value: number | string | null): number | null {
  if (value === null || value === undefined || value === '') return null

  const num = typeof value === 'string' ? parseInt(value, 10) : value
  if (isNaN(num)) return null

  return Math.floor(num)
}

/**
 * Format status value (keep as-is, but ensure valid format)
 *
 * @param status - Status string (e.g., '【S】', '【A】')
 * @returns Status string or empty string
 *
 * @example
 * formatStatus('【S】') → '【S】'
 * formatStatus(null) → ''
 */
export function formatStatus(status: string | null): string {
  if (!status) return ''
  return status.trim()
}

/**
 * Format array as comma-separated string
 *
 * @param arr - Array of strings
 * @returns Comma-separated string or empty string
 *
 * @example
 * formatArray(['123', '456', '789']) → '123, 456, 789'
 * formatArray(null) → ''
 */
export function formatArray(arr: string[] | null): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return ''
  return arr.join(', ')
}

/**
 * Format null values as empty string (Google Sheets prefers empty strings)
 *
 * @param value - Any value
 * @returns Value or empty string if null/undefined
 *
 * @example
 * formatNull(null) → ''
 * formatNull(undefined) → ''
 * formatNull('test') → 'test'
 */
export function formatNull(value: any): string | number {
  if (value === null || value === undefined) return ''
  return value
}

/**
 * Format string value (trim whitespace)
 *
 * @param value - String value
 * @returns Trimmed string or empty string
 *
 * @example
 * formatString('  hello  ') → 'hello'
 * formatString(null) → ''
 */
export function formatString(value: string | null): string {
  if (!value) return ''
  return String(value).trim()
}

/**
 * Main formatter - auto-detect type and format accordingly
 *
 * @param value - Any value
 * @param fieldName - Field name for type detection
 * @returns Formatted value
 */
export function formatValue(value: any, fieldName: string): any {
  // Handle null/undefined
  if (value === null || value === undefined) return ''

  // Date fields
  if (
    fieldName.includes('date') ||
    fieldName === 'starting_date' ||
    fieldName === 'action_date' ||
    fieldName === 'proposal_date' ||
    fieldName === 'interested_date' ||
    fieldName === 'acceptance_date'
  ) {
    return formatDateForSheet(value)
  }

  // Decimal fields
  if (
    fieldName === 'day_gross' ||
    fieldName === 'day_net_rev' ||
    fieldName === 'ecpm' ||
    fieldName === 'max_gross' ||
    fieldName === 'q_gross' ||
    fieldName === 'q_net_rev'
  ) {
    return formatDecimal(value)
  }

  // Revenue share - convert to decimal for sheet (20 → 0.2 for 20%)
  if (fieldName === 'revenue_share') {
    if (value === null || value === undefined || value === '') return null
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return null
    // Convert percentage to decimal (20 → 0.2)
    return num / 100
  }

  // Integer fields
  if (fieldName === 'imp') {
    return formatInteger(value)
  }

  // Progress percent - convert to decimal for sheet (30 → 0.3 for 30%)
  if (fieldName === 'progress_percent') {
    if (value === null || value === undefined || value === '') return null
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return null
    // Convert percentage to decimal (30 → 0.3)
    return num / 100
  }

  // Status field
  if (fieldName === 'status') {
    return formatStatus(value)
  }

  // String fields (default)
  return formatString(value)
}

/**
 * Batch format values for an entire row
 *
 * @param values - Object with field names as keys
 * @returns Array of formatted values in order
 */
export function formatRowValues(
  values: Record<string, any>,
  fieldOrder: string[]
): any[] {
  return fieldOrder.map((fieldName) => {
    const value = values[fieldName]
    return formatValue(value, fieldName)
  })
}
