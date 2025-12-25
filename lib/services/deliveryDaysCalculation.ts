/**
 * Delivery Days Calculation Service
 *
 * Replicates Google Sheet formula for calculating delivery_days
 * from 係数管理 (Coefficient Management) sheet
 *
 * Google Sheet Formula (Column BM-CA):
 * =IF($AB<EOMONTH(AX,-1)+1,'係数管理'!C$6,IF(AX-$AB<0,0,AX-$AB+1))
 *
 * Where:
 * - $AB = starting_date (Column AB)
 * - AX = end_date (Column AX)
 * - '係数管理'!C$6 = Default delivery days from Coefficient Management sheet row 6
 *
 * Logic:
 * 1. If starting_date < first day of month: use default from 係数管理 row 6
 * 2. If end_date < starting_date: return 0
 * 3. Otherwise: return (end_date - starting_date + 1)
 */

/**
 * Default delivery days per month from 係数管理 sheet row 6
 * Format: [Jan, Feb(28), Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan(next), Feb(28), Mar(next), Apr(next)]
 *
 * Index mapping to calendar months for FY quarters:
 * - Q1 (Apr-Jun): indices 3, 4, 5 → [31, 30, 31]
 * - Q2 (Jul-Sep): indices 6, 7, 8 → [30, 31, 31]
 * - Q3 (Oct-Dec): indices 9, 10, 11 → [30, 31, 30]
 * - Q4 (Jan-Mar): indices 0, 1, 2 → [31, 28, 31]
 */
const DEFAULT_DELIVERY_DAYS = [
  31, // Jan
  28, // Feb (non-leap year)
  31, // Mar
  31, // Apr
  30, // May
  31, // Jun
  30, // Jul
  31, // Aug
  31, // Sep
  30, // Oct
  31, // Nov
  30, // Dec
  31, // Jan (next year)
  28, // Feb (next year, non-leap)
  31, // Mar (next year)
  31, // Apr (next year)
]

/**
 * Get the default delivery days for a given month
 *
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12, where 1=Jan, 12=Dec)
 * @returns Default delivery days for that month
 */
function getDefaultDeliveryDays(year: number, month: number): number {
  // Convert month (1-12) to array index (0-11)
  const monthIndex = month - 1

  // Handle leap years for February
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    return isLeapYear ? 29 : 28
  }

  // Return from DEFAULT_DELIVERY_DAYS array
  return DEFAULT_DELIVERY_DAYS[monthIndex] || 30
}

/**
 * Get the first day of a given month
 * Equivalent to EOMONTH(date, -1) + 1 in Excel
 *
 * @param year - Year
 * @param month - Month (1-12)
 * @returns First day of the month as Date object
 */
function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1)
}

/**
 * Calculate delivery days for a specific month
 *
 * Matches Google Sheet logic where each month uses the LAST DAY OF THAT MONTH as end_date.
 * Google Sheet does NOT use a global pipeline.end_date for delivery_days calculation!
 *
 * Column structure in Google Sheet:
 * - Column AB = starting_date (one value for entire pipeline)
 * - Column AX = end_date of January (31/1)
 * - Column AY = end_date of February (28/2 or 29/2)
 * - Column AZ = end_date of March (31/3)
 * - ...and so on
 *
 * For Q3 (Oct-Nov-Dec):
 * - October uses 31/10 as end_date
 * - November uses 30/11 as end_date
 * - December uses 31/12 as end_date
 *
 * @param startingDate - Pipeline starting date (Column AB)
 * @param year - Target year for the month
 * @param month - Target month (1-12)
 * @returns Calculated delivery days for the month
 */
export function calculateDeliveryDays(
  startingDate: Date | string | null,
  year: number,
  month: number
): number {
  // Handle null starting_date - use default days
  if (!startingDate) {
    return getDefaultDeliveryDays(year, month)
  }

  // Convert to Date object if string
  const startDate = typeof startingDate === 'string' ? new Date(startingDate) : startingDate

  // Get first day and last day of the target month
  const firstDayOfMonth = getFirstDayOfMonth(year, month)
  const lastDayOfMonth = new Date(year, month, 0) // Day 0 of next month = last day of current month

  // CRITICAL: Check if month is BEFORE starting_date
  // If the entire month is before starting_date, pipeline hasn't started yet → return 0
  if (lastDayOfMonth < startDate) {
    return 0
  }

  // Calculate actual delivery days within this month
  // Start from whichever is later: starting_date or first day of month
  const effectiveStartDate = startDate > firstDayOfMonth ? startDate : firstDayOfMonth

  // End at last day of month (NOT using any global end_date)
  const effectiveEndDate = lastDayOfMonth

  // Calculate days between effective start and end
  const daysDiff = Math.floor(
    (effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysDiff + 1
}

/**
 * Calculate delivery days for multiple months in a fiscal quarter
 *
 * Each month uses the last day of that month as end_date.
 * Does NOT use a global pipeline end_date.
 *
 * @param startingDate - Pipeline starting date
 * @param months - Array of { year, month } objects to calculate for
 * @returns Array with calculated delivery_days for each month
 */
export function calculateQuarterlyDeliveryDays(
  startingDate: Date | string | null,
  months: Array<{ year: number; month: number }>
): Array<{ year: number; month: number; delivery_days: number }> {
  return months.map(({ year, month }) => ({
    year,
    month,
    delivery_days: calculateDeliveryDays(startingDate, year, month),
  }))
}
