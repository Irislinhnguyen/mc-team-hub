import type { AnalyticsApiResponse } from '../types/performanceTracker'

/**
 * API utility functions for analytics endpoints
 *
 * These helpers provide consistent error handling and request formatting
 * for all analytics data fetching operations.
 */

/**
 * Fetch analytics data from a given endpoint with filters
 *
 * @param endpoint - API endpoint path
 * @param filters - Filter parameters to send in request body
 * @param options - Additional fetch options
 * @returns Promise with response data
 * @throws Error if request fails or response is not ok
 *
 * @example
 * const data = await fetchAnalyticsData('/api/performance-tracker/business-health-filtered', {
 *   startDate: '2024-10-01',
 *   endDate: '2024-10-31',
 *   team: 'Team A'
 * })
 */
export async function fetchAnalyticsData<T = any>(
  endpoint: string,
  filters: Record<string, any>,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
    ...options
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch data from ${endpoint}`)
  }

  const result: AnalyticsApiResponse<T> = await response.json()

  if (result.status === 'ok' || result.status === 'success') {
    return result.data as T
  }

  throw new Error(result.message || result.error || 'Unknown error fetching data')
}

/**
 * Fetch metadata (filter options) from the analytics API
 *
 * @returns Promise with metadata containing all filter options
 * @throws Error if request fails
 *
 * @example
 * const metadata = await fetchMetadata()
 * console.log(metadata.teams) // [{ label: 'Team A', value: 'team-a' }, ...]
 */
export async function fetchMetadata() {
  const response = await fetch('/api/performance-tracker/metadata')

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch metadata`)
  }

  const result = await response.json()

  if (result.status === 'ok') {
    return result.data
  }

  throw new Error(result.message || 'Unknown error fetching metadata')
}

/**
 * Fetch paginated analytics data
 *
 * @param endpoint - API endpoint (default: '/api/performance-tracker/business-health-paginated')
 * @param queryType - Type of query to execute
 * @param filters - Filter parameters
 * @param offset - Pagination offset
 * @param limit - Number of rows to fetch
 * @returns Promise with paginated response
 *
 * @example
 * const result = await fetchPaginatedData(
 *   '/api/performance-tracker/business-health-paginated',
 *   'zoneMonitoringTimeSeries',
 *   { startDate: '2024-10-01', endDate: '2024-10-31' },
 *   0,
 *   500
 * )
 * console.log(result.rows) // Array of data rows
 * console.log(result.totalCount) // Total number of rows available
 */
export async function fetchPaginatedData(
  endpoint: string,
  queryType: string,
  filters: Record<string, any>,
  offset: number,
  limit: number
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters,
      queryType,
      offset,
      limit
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch paginated data: ${queryType}`)
  }

  const result = await response.json()

  if (result.status === 'success') {
    return result.data
  }

  throw new Error(result.message || 'Unknown error fetching paginated data')
}
