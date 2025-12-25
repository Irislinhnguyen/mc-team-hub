/**
 * Date Helper Utilities for Pipeline Management
 */

/**
 * Calculate days between two dates
 * @param date1 - First date (string or Date)
 * @param date2 - Second date (string or Date)
 * @returns Number of days between dates (absolute value)
 */
export function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2

  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Get the start date of the current fiscal quarter
 * Fiscal year: Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)
 * @param date - Reference date (defaults to today)
 * @returns Start date of current quarter
 */
export function getQuarterStart(date: Date = new Date()): Date {
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()

  // Determine quarter based on month
  if (month >= 4 && month <= 6) {
    // Q1: April 1
    return new Date(year, 3, 1) // Month is 0-indexed
  } else if (month >= 7 && month <= 9) {
    // Q2: July 1
    return new Date(year, 6, 1)
  } else if (month >= 10 && month <= 12) {
    // Q3: October 1
    return new Date(year, 9, 1)
  } else {
    // Q4: January 1 (previous calendar year for Jan-Mar)
    return new Date(year, 0, 1)
  }
}

/**
 * Format date relative to today (e.g., "2 days ago", "in 5 days")
 * @param date - Date to format
 * @returns Relative date string
 */
export function formatDateRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)

  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 0) return `in ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

/**
 * Format date as short string (e.g., "Jan 15, 2024")
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns True if date is before today
 */
export function isPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)

  return d < today
}

/**
 * Check if a date is within the next N days
 * @param date - Date to check
 * @param days - Number of days to look ahead
 * @returns True if date is within the next N days
 */
export function isWithinDays(date: string | Date, days: number): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(today.getDate() + days)

  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  futureDate.setHours(23, 59, 59, 999)

  return d >= today && d <= futureDate
}
