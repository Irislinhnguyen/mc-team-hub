import { useMemo } from 'react'

interface DateRange {
  startDate: string
  endDate: string
}

/**
 * Custom hook to calculate default date range
 *
 * @param days - Number of days to go back from today (default: 30)
 * @returns {DateRange} Object with startDate and endDate in YYYY-MM-DD format
 *
 * @example
 * const defaultFilters = useDefaultDateRange(30)
 * // Returns: { startDate: '2024-10-01', endDate: '2024-10-31' }
 *
 * const sixMonths = useDefaultDateRange(180)
 * // Returns: { startDate: '2024-05-04', endDate: '2024-10-31' }
 */
export function useDefaultDateRange(days: number = 30): DateRange {
  return useMemo(() => {
    const today = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }
  }, [days])
}
