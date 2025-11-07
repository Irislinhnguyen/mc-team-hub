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

/**
 * Advanced Filter Types
 * These types support Looker Studio-style advanced filtering with operators
 */

/**
 * Filter operators - Dynamic branching system
 *
 * Branch 1 (Entity operators): Unfold to attributeField + condition + value
 * Branch 2 (Direct operators): Unfold to value only
 */
export type FilterOperator =
  // Branch 2: Direct operators (field + operator + value)
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'between'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex_match'
  | 'is_null'
  | 'is_not_null'
  // Branch 1: Entity operators (entityField + operator + attributeField + condition + value)
  | 'has'
  | 'does_not_have'
  | 'only_has'
  | 'has_all'
  | 'has_any'

/**
 * Data type for a filter field
 */
export type FilterDataType = 'string' | 'number' | 'date' | 'boolean'

/**
 * A single filter clause - supports both direct and entity operators
 *
 * Direct operator (Branch 2): field + operator + value
 * Example: pid equals 1234
 *
 * Entity operator (Branch 1): field + operator + attributeField + condition + value
 * Example: zid has product equals video
 */
export interface AdvancedFilterClause {
  id: string  // Unique identifier
  field: FilterField  // Entity field (for Branch 1) or direct field (for Branch 2)
  dataType: FilterDataType
  operator: FilterOperator

  // Branch 1 only: Entity operator additional fields
  attributeField?: FilterField  // The attribute to check (e.g., 'product' in "zid has product")
  attributeDataType?: FilterDataType  // Data type of the attribute field
  condition?: FilterOperator  // The condition to apply (e.g., 'equals' in "zid has product equals video")

  value: any  // Single value or array depending on operator/condition
  enabled: boolean  // Allow users to temporarily disable clauses
}

/**
 * A group of filter clauses combined with AND/OR logic
 * @deprecated Use SimplifiedFilter instead for Looker Studio-style filtering
 */
export interface AdvancedFilterGroup {
  id: string
  name?: string  // Optional name for saved filter groups
  logic: 'AND' | 'OR'  // How to combine clauses within this group
  clauses: AdvancedFilterClause[]
}

/**
 * Complete advanced filter configuration
 * @deprecated Use SimplifiedFilter instead for Looker Studio-style filtering
 */
export interface AdvancedFilters {
  groups: AdvancedFilterGroup[]
  groupLogic: 'AND' | 'OR'  // How to combine groups
}

/**
 * Simplified filter configuration (Looker Studio-style)
 * Single-level flat structure with Include/Exclude toggle
 */
export interface SimplifiedFilter {
  name?: string  // Optional name for saving
  includeExclude: 'INCLUDE' | 'EXCLUDE'  // Top-level toggle: INCLUDE = WHERE (...), EXCLUDE = WHERE NOT (...)
  clauses: AdvancedFilterClause[]  // Flat array of conditions
  clauseLogic: 'AND' | 'OR'  // How to combine all clauses (single toggle)
}

/**
 * Field-to-operator mapping
 * All fields support both direct operators and entity operators
 */
export const FIELD_OPERATORS: Record<FilterField, FilterOperator[]> = {
  // Entity fields (can use "has" to query attributes)
  pid: ['equals', 'in', 'greater_than', 'less_than', 'between', 'has', 'does_not_have', 'only_has', 'has_all', 'has_any', 'is_null', 'is_not_null'],
  mid: ['equals', 'in', 'greater_than', 'less_than', 'between', 'has', 'does_not_have', 'only_has', 'has_all', 'has_any', 'is_null', 'is_not_null'],
  zid: ['equals', 'in', 'greater_than', 'less_than', 'between', 'has', 'does_not_have', 'only_has', 'has_all', 'has_any', 'is_null', 'is_not_null'],

  // String fields
  team: ['equals', 'in', 'contains', 'starts_with', 'is_null', 'is_not_null'],
  pic: ['equals', 'in', 'contains', 'starts_with', 'is_null', 'is_not_null'],
  product: ['equals', 'in', 'is_null', 'is_not_null'],
  h5: ['equals', 'in', 'is_null', 'is_not_null'],
  pubname: ['equals', 'in', 'contains', 'starts_with', 'regex_match', 'is_null', 'is_not_null'],
  medianame: ['equals', 'in', 'contains', 'starts_with', 'regex_match', 'is_null', 'is_not_null'],
  zonename: ['equals', 'in', 'contains', 'starts_with', 'regex_match', 'is_null', 'is_not_null'],

  // Categorical fields
  revenue_tier: ['equals', 'in', 'is_null', 'is_not_null'],
  rev_flag: ['equals', 'in', 'is_null', 'is_not_null'],

  // Date fields
  daterange: ['between', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'is_null', 'is_not_null'],
  month: ['equals', 'in', 'greater_than', 'less_than'],
  year: ['equals', 'in', 'greater_than', 'less_than']
}

/**
 * Field data type mapping
 */
export const FIELD_DATA_TYPES: Record<FilterField, FilterDataType> = {
  // Numeric
  pid: 'number',
  mid: 'number',
  zid: 'number',
  month: 'number',
  year: 'number',

  // String
  team: 'string',
  pic: 'string',
  product: 'string',
  h5: 'string',
  pubname: 'string',
  medianame: 'string',
  zonename: 'string',
  revenue_tier: 'string',
  rev_flag: 'string',

  // Date
  daterange: 'date'
}

/**
 * Operator labels for UI display
 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  // Branch 2: Direct operators
  equals: 'equals',
  not_equals: 'not equals',
  in: 'in',
  not_in: 'not in',
  greater_than: 'greater than',
  greater_than_or_equal: 'greater than or equal',
  less_than: 'less than',
  less_than_or_equal: 'less than or equal',
  between: 'between',
  contains: 'contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  regex_match: 'matches pattern',
  is_null: 'is empty',
  is_not_null: 'is not empty',
  // Branch 1: Entity operators (will unfold to show attributeField + condition)
  has: 'has',
  does_not_have: 'does not have',
  only_has: 'only has',
  has_all: 'has all',
  has_any: 'has any'
}

/**
 * Check if operator is an entity operator (Branch 1)
 */
export function isEntityOperator(operator: FilterOperator): boolean {
  return ['has', 'does_not_have', 'only_has', 'has_all', 'has_any'].includes(operator)
}
