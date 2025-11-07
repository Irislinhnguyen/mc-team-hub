import type { MetadataOptions } from '../hooks/useAnalyticsMetadata'
import type { FilterConfig, FilterField } from '../types/performanceTracker'

/**
 * Filter configuration builder for analytics pages
 *
 * Provides a centralized way to create consistent filter configurations
 * across all analytics dashboards.
 */

/**
 * Build filter configuration array from metadata
 *
 * @param metadata - Metadata options containing filter values
 * @param fields - Array of filter field names to include
 * @returns Object with filter configurations and count
 *
 * @example
 * const { filters, count } = buildFilterConfig(metadata, [
 *   'daterange',
 *   'team',
 *   'pic',
 *   'product'
 * ])
 *
 * <FilterPanel filters={filters} filterCount={count} ... />
 */
export function buildFilterConfig(
  metadata: MetadataOptions | null,
  fields: FilterField[]
): { filters: FilterConfig[]; count: number } {
  // Base configuration for all possible filters
  const configs: Record<FilterField, FilterConfig> = {
    daterange: {
      name: 'daterange',
      label: 'Select date',
      type: 'daterange',
    },
    team: {
      name: 'team',
      label: 'team',
      type: 'select',
      options: metadata?.teams || [],
    },
    pic: {
      name: 'pic',
      label: 'pic',
      type: 'select',
      options: metadata?.pics || [],
    },
    h5: {
      name: 'h5',
      label: 'h5',
      type: 'select',
      options: metadata?.products || [],
    },
    product: {
      name: 'product',
      label: 'product',
      type: 'select',
      options: metadata?.products || [],
    },
    pid: {
      name: 'pid',
      label: 'pid',
      type: 'select',
      options: metadata?.pids || [],
    },
    mid: {
      name: 'mid',
      label: 'mid',
      type: 'select',
      options: metadata?.mids || [],
    },
    pubname: {
      name: 'pubname',
      label: 'pubname',
      type: 'select',
      options: metadata?.pubnames || [],
    },
    medianame: {
      name: 'medianame',
      label: 'medianame',
      type: 'select',
      options: metadata?.medianames || [],
    },
    zid: {
      name: 'zid',
      label: 'zid',
      type: 'select',
      options: metadata?.zids || [],
    },
    zonename: {
      name: 'zonename',
      label: 'zonename',
      type: 'select',
      options: metadata?.zonenames || [],
    },
    rev_flag: {
      name: 'rev_flag',
      label: 'rev_flag',
      type: 'select',
      options: metadata?.rev_flags || [],
    },
    revenue_tier: {
      name: 'revenue_tier',
      label: 'Revenue Tier',
      type: 'select',
      options: metadata?.revenue_tiers || [],
    },
    month: {
      name: 'month',
      label: 'Month',
      type: 'select',
      options: metadata?.months || [],
    },
    year: {
      name: 'year',
      label: 'Year',
      type: 'select',
      options: metadata?.years || [],
    },
  }

  // Return only the requested fields in order with count
  const filters = fields.map(field => configs[field])
  return {
    filters,
    count: filters.length
  }
}

/**
 * Standard filter sets for common use cases
 */
export const FILTER_SETS = {
  /**
   * Full filter set with all available options
   */
  FULL: [
    'daterange',
    'team',
    'pic',
    'h5',
    'product',
    'pid',
    'mid',
    'pubname',
    'medianame',
    'zid',
    'zonename',
  ] as FilterField[],

  /**
   * Basic filter set with date and team
   */
  BASIC: ['daterange', 'team'] as FilterField[],

  /**
   * Publisher-focused filter set
   */
  PUBLISHER: ['daterange', 'team', 'pic', 'product', 'pid', 'pubname'] as FilterField[],

  /**
   * Media-focused filter set
   */
  MEDIA: ['daterange', 'team', 'mid', 'medianame'] as FilterField[],

  /**
   * Zone-focused filter set
   */
  ZONE: ['daterange', 'team', 'product', 'zid', 'zonename'] as FilterField[],
}
