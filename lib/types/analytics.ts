/**
 * Shared type definitions for analytics pages
 *
 * These types ensure consistency across all analytics dashboards
 */

// Re-export from hooks for convenience
export type { MetadataOptions } from '../hooks/useAnalyticsMetadata'

/**
 * Filter configuration for FilterPanel component
 */
export interface FilterConfig {
  name: string
  label: string
  type: 'daterange' | 'select'
  options?: Array<{ label: string; value: string }>
}

/**
 * Standard column definition for DataTable/LazyDataTable
 */
export interface ColumnConfig {
  key: string
  label: string
  width?: string
  format?: (value: any) => string
}

/**
 * Common filter field names used across analytics pages
 */
export type FilterField =
  | 'daterange'
  | 'team'
  | 'pic'
  | 'h5'
  | 'product'
  | 'pid'
  | 'mid'
  | 'pubname'
  | 'medianame'
  | 'zid'
  | 'zonename'
  | 'rev_flag'
  | 'revenue_tier'
  | 'month'
  | 'year'

/**
 * API response structure for analytics data
 */
export interface AnalyticsApiResponse<T = any> {
  status: 'ok' | 'success' | 'error'
  data?: T
  message?: string
  error?: string
}

/**
 * Paginated API response structure
 */
export interface PaginatedApiResponse<T = any> {
  status: 'success' | 'error'
  data: {
    rows: T[]
    totalCount: number
  }
  message?: string
}
