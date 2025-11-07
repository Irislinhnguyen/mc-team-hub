/**
 * Filter Preview Generator
 *
 * Utility to convert SimplifiedFilter objects into natural language descriptions
 * that help users understand what their filter does.
 */

import type { SimplifiedFilter, FilterField, FilterOperator, FilterDataType, AdvancedFilterClause } from '../types/performanceTracker'
import { OPERATOR_LABELS, isEntityOperator } from '../types/performanceTracker'

/**
 * Field display labels for natural language
 */
const FIELD_LABELS: Record<FilterField, string> = {
  team: 'team',
  pic: 'PIC',
  product: 'product',
  pid: 'PID',
  mid: 'MID',
  zid: 'zone ID',
  h5: 'H5',
  pubname: 'publisher name',
  medianame: 'media name',
  zonename: 'zone name',
  rev_flag: 'revenue flag',
  revenue_tier: 'revenue tier',
  month: 'month',
  year: 'year',
  daterange: 'date range',
}

/**
 * Format a filter value for display in natural language
 */
function formatValue(
  value: any,
  operator: FilterOperator,
  dataType: FilterDataType
): string {
  // Null check operators don't need values
  if (operator === 'is_null') return 'empty'
  if (operator === 'is_not_null') return 'not empty'

  // Array-based operators (in, not_in, entity operators with multiple values)
  if (['in', 'not_in', 'only_has', 'has_all', 'has_any'].includes(operator)) {
    const values = Array.isArray(value) ? value : [value]
    if (values.length === 0) return '[]'
    if (values.length === 1) return dataType === 'string' ? `'${values[0]}'` : String(values[0])
    return `[${values.map(v => dataType === 'string' ? `'${v}'` : v).join(', ')}]`
  }

  // Between operator needs two values
  if (operator === 'between') {
    const [min, max] = Array.isArray(value) ? value : [value, value]
    return `${min} and ${max}`
  }

  // String values get quotes
  if (dataType === 'string') {
    return `'${value}'`
  }

  // Numbers and others
  return String(value)
}

/**
 * Get field display label
 */
function getFieldLabel(field: FilterField): string {
  return FIELD_LABELS[field] || field
}

/**
 * Convert operator label to natural language (lowercase, friendlier)
 */
function formatOperator(operator: FilterOperator): string {
  const label = OPERATOR_LABELS[operator]
  if (!label) return operator

  // Keep entity operators as-is, lowercase others
  if (isEntityOperator(operator)) {
    return label
  }

  return label.toLowerCase()
}

/**
 * Format a clause for display - handles both direct and entity operators
 */
function formatClause(clause: AdvancedFilterClause): string {
  const fieldLabel = getFieldLabel(clause.field)
  const operatorLabel = formatOperator(clause.operator)

  // Branch 1: Entity operator
  if (isEntityOperator(clause.operator) && clause.attributeField && clause.condition) {
    const attributeLabel = getFieldLabel(clause.attributeField)
    const conditionLabel = formatOperator(clause.condition)
    const valueStr = formatValue(clause.value, clause.condition, clause.attributeDataType || 'string')
    return `${fieldLabel} ${operatorLabel} ${attributeLabel} ${conditionLabel} ${valueStr}`
  }

  // Branch 2: Direct operator
  const valueStr = formatValue(clause.value, clause.operator, clause.dataType)
  return `${fieldLabel} ${operatorLabel} ${valueStr}`
}

/**
 * Generate a natural language preview for a SimplifiedFilter
 *
 * @param filter - The filter to generate preview for
 * @returns Multi-line string with natural language description
 *
 * @example
 * ```
 * Include records where:
 *   • team equals 'Team A'
 *   AND
 *   • pid is greater than 1000
 * ```
 */
export function generateFilterPreview(filter: SimplifiedFilter): string {
  // Handle empty filter
  if (!filter.clauses || filter.clauses.length === 0) {
    return 'No conditions defined'
  }

  // Only show enabled clauses
  const enabledClauses = filter.clauses.filter(c => c.enabled)

  if (enabledClauses.length === 0) {
    return 'All conditions are disabled'
  }

  // Start with Include/Exclude mode
  const mode = filter.includeExclude === 'INCLUDE' ? 'Include' : 'Exclude'
  const lines: string[] = [`${mode} records where:`]

  // Add each clause
  enabledClauses.forEach((clause, index) => {
    const conditionText = `  • ${formatClause(clause)}`
    lines.push(conditionText)

    // Add logic separator (AND/OR) between conditions
    if (index < enabledClauses.length - 1) {
      lines.push(`  ${filter.clauseLogic}`)
    }
  })

  return lines.join('\n')
}

/**
 * Generate a compact single-line preview for list views
 *
 * @param filter - The filter to generate preview for
 * @returns Single-line summary
 *
 * @example
 * ```
 * Include: team = 'A' AND pid > 1000
 * ```
 */
export function generateCompactPreview(filter: SimplifiedFilter): string {
  if (!filter.clauses || filter.clauses.length === 0) {
    return 'No conditions'
  }

  const enabledClauses = filter.clauses.filter(c => c.enabled)

  if (enabledClauses.length === 0) {
    return 'All disabled'
  }

  const mode = filter.includeExclude === 'INCLUDE' ? 'Include' : 'Exclude'

  const conditions = enabledClauses.map(clause => formatClause(clause))

  return `${mode}: ${conditions.join(` ${filter.clauseLogic} `)}`
}

/**
 * Get clause count summary
 *
 * @param filter - The filter to summarize
 * @returns Summary like "2 conditions (1 active)"
 */
export function getClauseCountSummary(filter: SimplifiedFilter): string {
  const total = filter.clauses?.length || 0
  const enabled = filter.clauses?.filter(c => c.enabled).length || 0

  if (total === 0) {
    return 'No conditions'
  }

  if (enabled === total) {
    return `${total} condition${total !== 1 ? 's' : ''}`
  }

  return `${total} condition${total !== 1 ? 's' : ''} (${enabled} active)`
}
