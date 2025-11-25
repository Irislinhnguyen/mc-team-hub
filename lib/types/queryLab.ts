/**
 * Query Lab Type Definitions
 * Types for building and executing custom queries in the Query Lab feature
 */

/**
 * Entity types that can be queried
 */
export type QueryEntity = 'pid' | 'mid' | 'zid' | 'team' | 'pic' | 'product'

/**
 * Condition types for multi-level entity queries
 */
export type ConditionType = 'has' | 'does_not_have' | 'only_has' | 'has_all' | 'has_any'

/**
 * Field operators for filtering
 */
export type FieldOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'between'

/**
 * Available calculated metrics
 */
export type CalculatedMetric =
  | 'revenue_change_pct'
  | 'req_change_pct'
  | 'ecpm_change_pct'
  | 'fill_rate_change_pct'
  | 'revenue_p1'
  | 'revenue_p2'
  | 'requests_p1'
  | 'requests_p2'
  | 'ecpm_p1'
  | 'ecpm_p2'
  | 'fill_rate_p1'
  | 'fill_rate_p2'
  | 'paid_p1'
  | 'paid_p2'

/**
 * Metric filter operators
 */
export type MetricOperator =
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'equals'
  | 'not_equals'
  | 'between'

/**
 * Aggregation functions for pivot table
 */
export type AggregationFunction = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX'

/**
 * Query condition for entity relationships and field filtering
 */
export interface QueryCondition {
  id: string  // Unique ID for React keys and manipulation
  type: ConditionType
  childEntity?: QueryEntity  // For multi-level queries (e.g., "PIDs that have ZIDs")
  field: string  // Field to filter on (e.g., "product", "revenue")
  operator: FieldOperator
  value: string | number | string[] | number[] | [number, number]
  logic?: 'AND' | 'OR'  // Logic to combine with next condition
}

/**
 * Metric filter for calculated metrics
 */
export interface MetricFilter {
  id: string  // Unique ID for React keys
  metric: CalculatedMetric
  operator: MetricOperator
  value: number | [number, number]  // Single value or range for 'between'
  logic?: 'AND' | 'OR'  // Logic to combine with next filter
}

/**
 * Complete query configuration
 */
export interface QueryConfig {
  entity: QueryEntity
  conditions: QueryCondition[]
  metricFilters: MetricFilter[]
  columns: string[]  // Columns to SELECT (for custom column selection)
  orderBy?: {
    field: string
    direction: 'ASC' | 'DESC'
  }
  limit?: number  // Row limit (default 10000)

  // Time periods parsed from natural language
  /** @deprecated Use periods array for flexibility */
  period1?: DateRange  // Main period (required for execution, can be set by AI or defaults)
  /** @deprecated Use periods array for flexibility */
  period2?: DateRange  // Comparison period (optional, for period-over-period analysis)
  /** @deprecated Use periods array for flexibility */
  periodCount?: 1 | 2  // Number of periods: 1 = single snapshot, 2 = comparison

  // NEW: Support for unlimited periods (3, 5, 10 years, etc.)
  periods?: DateRange[]  // Array of date ranges for multi-period analysis (e.g., 2020-2024 comparison)
}

/**
 * Date range for query periods
 */
export interface DateRange {
  start: string  // YYYY-MM-DD format
  end: string    // YYYY-MM-DD format
  label?: string  // Optional display label (e.g., "2020", "Q1 2024", "January")
}

/**
 * Query execution request
 */
export interface QueryLabRequest {
  queryConfig: QueryConfig

  // LEGACY: Deprecated in favor of periods array
  /** @deprecated Use periods array instead */
  period1?: DateRange
  /** @deprecated Use periods array instead */
  period2?: DateRange

  // NEW: Support unlimited periods
  periods?: DateRange[]  // Replaces period1/period2 for multi-period queries
}

/**
 * Query execution response
 */
export interface QueryLabResponse {
  data: Array<Record<string, any>>  // Raw result rows
  columns: ColumnMetadata[]  // Available columns with metadata
  rowCount: number
  executionTime?: number  // Query execution time in ms
}

/**
 * Column metadata
 */
export interface ColumnMetadata {
  name: string  // Column name (e.g., "pid", "revenue_p2")
  label: string  // Display label (e.g., "Publisher ID", "Revenue (P2)")
  type: 'string' | 'number' | 'date' | 'boolean'
  category: 'dimension' | 'metric' | 'calculated'  // For grouping in UI
  isCalculated?: boolean  // Whether it's a calculated metric
}

/**
 * Pivot table configuration
 */
export interface PivotConfig {
  rows: string[]  // Dimension fields for rows
  columns: string[]  // Dimension fields for columns
  values: PivotValue[]  // Metrics to aggregate
  filters?: Record<string, any>  // Additional filters on pivot data
}

/**
 * Pivot value configuration
 */
export interface PivotValue {
  field: string
  aggregation: AggregationFunction
  label?: string  // Custom label for display
}

/**
 * Computed pivot table data structure
 */
export interface PivotTableData {
  headers: string[]  // Column headers
  rows: PivotRow[]  // Data rows
  totals?: Record<string, number>  // Grand totals
}

/**
 * Pivot table row
 */
export interface PivotRow {
  key: string  // Unique row key
  label: string  // Row label
  values: Record<string, number | string>  // Column values
  children?: PivotRow[]  // Nested rows for multi-level grouping
}

/**
 * AI parsing request
 */
export interface AIParseRequest {
  query: string  // Natural language query
  context?: {
    availableEntities: QueryEntity[]
    availableFields: string[]
    availableMetrics: CalculatedMetric[]
  }
}

/**
 * AI parsing response
 */
export interface AIParseResponse {
  queryConfig: QueryConfig
  confidence: number  // 0-1 confidence score
  interpretation: string  // Human-readable explanation
  mappings: AIMapping[]  // Show what was mapped
  alternatives?: QueryConfig[]  // Alternative interpretations if confidence < 0.7
  suggestions?: string[]  // Suggestions for improving the query
}

/**
 * AI mapping explanation
 */
export interface AIMapping {
  original: string  // Original text from query
  mapped: string  // What it was mapped to
  type: 'entity' | 'field' | 'operator' | 'value' | 'metric'
}

/**
 * Saved query preset
 */
export interface QueryPreset {
  id: string
  name: string
  description?: string
  queryConfig: QueryConfig
  createdAt: string
  updatedAt: string
  isFavorite?: boolean
  tags?: string[]
}

/**
 * Field definition for query builder
 */
export interface FieldDefinition {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean'
  category: 'dimension' | 'metric' | 'calculated'
  description?: string
  operators: FieldOperator[]  // Allowed operators for this field
}

/**
 * Entity definition with available fields
 */
export interface EntityDefinition {
  id: QueryEntity
  label: string
  description: string
  fields: FieldDefinition[]
  childEntities?: QueryEntity[]  // Entities that can be queried as children
  parentEntities?: QueryEntity[]  // Entities that can contain this one
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'excel' | 'json'

/**
 * Export configuration
 */
export interface ExportConfig {
  format: ExportFormat
  filename?: string
  includeMetadata?: boolean  // Include query info in export
  includeTimestamp?: boolean  // Add timestamp to filename
}
