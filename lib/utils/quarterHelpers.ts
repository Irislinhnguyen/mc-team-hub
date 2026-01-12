/**
 * Quarter Helper Utilities
 *
 * Provides date calculation and validation functions for quarterly workflows
 */

export interface QuarterDateRange {
  start: string // ISO date (YYYY-MM-DD)
  end: string // ISO date (YYYY-MM-DD)
  year: number
  quarter: number
}

/**
 * Get quarter number (1-4) from a date
 * Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
 *
 * @param date - Date object or ISO string
 * @returns Quarter number (1-4)
 */
export function getQuarterFromDate(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const month = d.getMonth() + 1 // 1-12
  return Math.ceil(month / 3)
}

/**
 * Get year for a quarter (supports fiscal year if needed)
 *
 * @param date - Date object or ISO string
 * @returns Year
 */
export function getQuarterYear(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.getFullYear()
}

/**
 * Get date range for a specific quarter
 *
 * @param year - Year (e.g., 2025)
 * @param quarter - Quarter (1-4)
 * @returns Object with start/end dates and quarter info
 */
export function getQuarterDateRange(
  year: number,
  quarter: number
): QuarterDateRange {
  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}. Must be 1-4.`)
  }

  const startMonth = (quarter - 1) * 3 + 1 // 1, 4, 7, 10
  const endMonth = startMonth + 2 // 3, 6, 9, 12

  const start = new Date(year, startMonth - 1, 1)

  // Last day of quarter (day 0 = last day of previous month)
  const end = new Date(year, endMonth, 0)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    year,
    quarter
  }
}

/**
 * Validate that a proposal_date falls within the specified quarter
 *
 * @param proposalDate - Proposal date (ISO string or Date)
 * @param year - Quarter year
 * @param quarter - Quarter number (1-4)
 * @returns Validation result with error message if invalid
 */
export function validateProposalDateInQuarter(
  proposalDate: string | Date | null,
  year: number,
  quarter: number
): { valid: boolean; error?: string } {
  if (!proposalDate) {
    return { valid: false, error: 'proposal_date is required' }
  }

  const range = getQuarterDateRange(year, quarter)
  const date = new Date(proposalDate)
  const rangeStart = new Date(range.start)
  const rangeEnd = new Date(range.end)

  if (date < rangeStart || date > rangeEnd) {
    return {
      valid: false,
      error: `proposal_date ${date.toISOString().split('T')[0]} must be between ${range.start} and ${range.end} for Q${quarter} ${year}`
    }
  }

  return { valid: true }
}

/**
 * Get current quarter
 *
 * @returns Object with current year and quarter
 */
export function getCurrentQuarter(): { year: number; quarter: number } {
  const now = new Date()
  return {
    year: getQuarterYear(now),
    quarter: getQuarterFromDate(now)
  }
}

/**
 * Format quarter as string (e.g., "Q1 2025")
 *
 * @param year - Year
 * @param quarter - Quarter (1-4)
 * @returns Formatted string
 */
export function formatQuarter(year: number, quarter: number): string {
  return `Q${quarter} ${year}`
}

/**
 * Get next quarter
 *
 * @param year - Current year
 * @param quarter - Current quarter (1-4)
 * @returns Next quarter
 */
export function getNextQuarter(
  year: number,
  quarter: number
): { year: number; quarter: number } {
  if (quarter === 4) {
    return { year: year + 1, quarter: 1 }
  }
  return { year, quarter: quarter + 1 }
}

/**
 * Get previous quarter
 *
 * @param year - Current year
 * @param quarter - Current quarter (1-4)
 * @returns Previous quarter
 */
export function getPreviousQuarter(
  year: number,
  quarter: number
): { year: number; quarter: number } {
  if (quarter === 1) {
    return { year: year - 1, quarter: 4 }
  }
  return { year, quarter: quarter - 1 }
}

/**
 * Check if a date falls within a specific quarter
 *
 * @param date - Date to check
 * @param year - Quarter year
 * @param quarter - Quarter number (1-4)
 * @returns True if date is in quarter
 */
export function isDateInQuarter(
  date: Date | string | null,
  year: number,
  quarter: number
): boolean {
  if (!date) return false

  const d = typeof date === 'string' ? new Date(date) : date
  const dateYear = d.getFullYear()
  const dateQuarter = getQuarterFromDate(d)

  return dateYear === year && dateQuarter === quarter
}

/**
 * Get quarter info from a date
 *
 * @param date - Date object or ISO string
 * @returns Object with year, quarter, and formatted label
 */
export function getQuarterInfo(date: Date | string): {
  year: number
  quarter: number
  label: string
} {
  const year = getQuarterYear(date)
  const quarter = getQuarterFromDate(date)

  return {
    year,
    quarter,
    label: formatQuarter(year, quarter)
  }
}

/**
 * Get all months in a quarter
 *
 * @param quarter - Quarter number (1-4)
 * @returns Array of month numbers (1-12)
 */
export function getMonthsInQuarter(quarter: number): number[] {
  const startMonth = (quarter - 1) * 3 + 1
  return [startMonth, startMonth + 1, startMonth + 2]
}

/**
 * Check if a year is a leap year
 *
 * @param year - Year to check
 * @returns True if leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Get number of days in a specific month
 *
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Number of days
 */
export function getDaysInMonth(year: number, month: number): number {
  // Use Date constructor: day 0 = last day of previous month
  return new Date(year, month, 0).getDate()
}

/**
 * Generate an array of quarters for a year range
 * Useful for dropdowns and selectors
 *
 * @param startYear - Start year
 * @param endYear - End year
 * @returns Array of quarter objects with year, quarter, and label
 */
export function generateQuarterOptions(
  startYear: number,
  endYear: number
): Array<{ year: number; quarter: number; label: string }> {
  const options: Array<{ year: number; quarter: number; label: string }> = []

  for (let year = endYear; year >= startYear; year--) {
    for (let quarter = 4; quarter >= 1; quarter--) {
      options.push({
        year,
        quarter,
        label: formatQuarter(year, quarter)
      })
    }
  }

  return options
}
