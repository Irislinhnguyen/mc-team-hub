import type { MetadataOptions } from '../hooks/useAnalyticsMetadata'
import type { FilterConfig, FilterField } from '../types/performanceTracker'

/**
 * Filter configuration builder for analytics pages
 *
 * Provides a centralized way to create consistent filter configurations
 * across all analytics dashboards.
 */

/**
 * Dynamic options override for cascading filters
 */
export interface DynamicFilterOptions {
  pics?: Array<{ label: string; value: string }>
  pids?: Array<{ label: string; value: string }>
  pubnames?: Array<{ label: string; value: string }>
  mids?: Array<{ label: string; value: string }>
  medianames?: Array<{ label: string; value: string }>
  zids?: Array<{ label: string; value: string }>
  zonenames?: Array<{ label: string; value: string }>
}

/**
 * Build filter configuration array from metadata
 *
 * @param metadata - Metadata options containing filter values
 * @param fields - Array of filter field names to include
 * @param dynamicOptions - Optional override for cascading filter options
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
 *
 * @example With cascading filters
 * const { filters, count } = buildFilterConfig(metadata, fields, {
 *   pics: availablePics,
 *   pids: availablePids
 * })
 */
export function buildFilterConfig(
  metadata: MetadataOptions | null,
  fields: FilterField[],
  dynamicOptions?: DynamicFilterOptions
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
      options: dynamicOptions?.pics || metadata?.pics || [],
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
      options: dynamicOptions?.pids || metadata?.pids || [],
    },
    mid: {
      name: 'mid',
      label: 'mid',
      type: 'select',
      options: dynamicOptions?.mids || metadata?.mids || [],
    },
    pubname: {
      name: 'pubname',
      label: 'pubname',
      type: 'select',
      options: dynamicOptions?.pubnames || metadata?.pubnames || [],
    },
    medianame: {
      name: 'medianame',
      label: 'medianame',
      type: 'select',
      options: dynamicOptions?.medianames || metadata?.medianames || [],
    },
    zid: {
      name: 'zid',
      label: 'zid',
      type: 'select',
      options: dynamicOptions?.zids || metadata?.zids || [],
    },
    zonename: {
      name: 'zonename',
      label: 'zonename',
      type: 'select',
      options: dynamicOptions?.zonenames || metadata?.zonenames || [],
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
    // GCPP Check specific fields
    partner: {
      name: 'partner',
      label: 'Partner',
      type: 'select',
      options: metadata?.partners || [],
    },
    market: {
      name: 'market',
      label: 'Market',
      type: 'select',
      options: metadata?.markets || [],
    },
    publisher: {
      name: 'publisher',
      label: 'Publisher',
      type: 'select',
      options: metadata?.publishers || [],
    },
    domain_app_id: {
      name: 'domain_app_id',
      label: 'Domain/App ID',
      type: 'select',
      options: metadata?.domain_app_ids || [],
    },
    app_name: {
      name: 'app_name',
      label: 'App Name',
      type: 'select',
      options: metadata?.app_names || [],
    },
    pub_size_category: {
      name: 'pub_size_category',
      label: 'Publisher Size',
      type: 'select',
      options: metadata?.pub_size_categories || [],
    },
    category: {
      name: 'category',
      label: 'Publisher Category',
      type: 'select',
      options: metadata?.categories || [],
    },
    scenario: {
      name: 'scenario',
      label: 'Scenario',
      type: 'select',
      options: metadata?.scenarios || [],
    },
    performance: {
      name: 'performance',
      label: 'Performance',
      type: 'select',
      options: metadata?.performances || [],
    },
  }

  // Return only the requested fields in order with count
  // Filter out any undefined values (in case a field is requested but not configured)
  const filters = fields.map(field => configs[field]).filter(Boolean)
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
