import type { ColumnConfig } from '../types/performanceTracker'
import { formatDate } from '../utils/formatters'

/**
 * Standard column definitions for analytics tables
 *
 * Provides consistent column configurations (labels, widths, formatting)
 * across all analytics dashboards.
 */

/**
 * Standard column definitions with consistent widths and labels
 */
export const STANDARD_COLUMNS: Record<string, ColumnConfig> = {
  // Date columns
  date: {
    key: 'date',
    label: 'date',
    width: '18%',
    format: (v) => formatDate(v.value || v)
  },

  // ID columns
  pid: { key: 'pid', label: 'pid', width: '12%' },
  mid: { key: 'mid', label: 'mid', width: '12%' },
  zid: { key: 'zid', label: 'zid', width: '10%' },

  // Name columns
  pubname: { key: 'pubname', label: 'pubname', width: '40%' },
  medianame: { key: 'medianame', label: 'medianame', width: '40%' },
  zonename: { key: 'zonename', label: 'zonename', width: '18%' },
  product: { key: 'product', label: 'product', width: '12%' },
  team: { key: 'team', label: 'team', width: '15%' },
  pic: { key: 'pic', label: 'pic', width: '20%' },

  // Metric columns
  rev: { key: 'rev', label: 'rev', width: '15%' },
  revenue: { key: 'revenue', label: 'revenue', width: '15%' },
  profit: { key: 'profit', label: 'profit', width: '15%' },
  req: {
    key: 'req',
    label: 'req',
    width: '11%',
    format: (v) => parseInt(v).toLocaleString()
  },
  requests: {
    key: 'requests',
    label: 'requests',
    width: '11%',
    format: (v) => parseInt(v).toLocaleString()
  },
  paid: {
    key: 'paid',
    label: 'paid',
    width: '11%',
    format: (v) => parseInt(v).toLocaleString()
  },
  fill_rate: {
    key: 'fill_rate',
    label: 'fill rate',
    width: '10%',
    format: (v) => `${Math.round(v * 100)}%`
  },
  request_CPM: { key: 'request_CPM', label: 'request_CPM', width: '12%' },
  ecpm: { key: 'ecpm', label: 'ecpm', width: '12%' },
}

/**
 * Get column configurations by keys
 *
 * @param columnKeys - Array of column keys to retrieve
 * @returns Array of column configurations
 *
 * @example
 * const columns = getColumns(['date', 'pid', 'pubname', 'rev', 'profit'])
 *
 * <DataTable columns={columns} ... />
 */
export function getColumns(columnKeys: string[]): ColumnConfig[] {
  return columnKeys.map(key =>
    STANDARD_COLUMNS[key] || { key, label: key }
  )
}

/**
 * Common column sets for different table types
 */
export const COLUMN_SETS = {
  /**
   * Publisher columns (PID tables)
   */
  PUBLISHER: ['date', 'pid', 'pubname', 'rev', 'profit'] as const,

  /**
   * Media columns (MID tables)
   */
  MEDIA: ['date', 'mid', 'medianame', 'rev', 'profit'] as const,

  /**
   * Zone columns (ZID tables)
   */
  ZONE: [
    'date',
    'zid',
    'zonename',
    'product',
    'req',
    'fill_rate',
    'request_CPM',
    'rev',
    'profit'
  ] as const,

  /**
   * Summary columns (no date)
   */
  PUBLISHER_SUMMARY: ['pid', 'pubname', 'rev', 'profit'] as const,
  MEDIA_SUMMARY: ['mid', 'medianame', 'rev', 'profit'] as const,
  ZONE_SUMMARY: [
    'zid',
    'zonename',
    'product',
    'req',
    'fill_rate',
    'request_CPM',
    'rev',
    'profit'
  ] as const,
}
