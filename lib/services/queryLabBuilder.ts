/**
 * Query Lab SQL Builder
 *
 * Converts QueryConfig from visual builder into BigQuery SQL
 * Supports multi-level entity queries and metric filters
 */

import type {
  QueryConfig,
  QueryCondition,
  MetricFilter,
  QueryEntity,
  DateRange
} from '../types/queryLab'

/**
 * Escape SQL value to prevent injection attacks
 */
function escapeSqlValue(value: any, dataType: 'string' | 'number'): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (dataType === 'number') {
    const num = Number(value)
    if (isNaN(num)) {
      throw new Error(`Invalid number value: ${value}`)
    }
    return String(num)
  }

  // String: escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * Get table name for BigQuery
 */
function getTableName(): string {
  return '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'
}

/**
 * Get ID field and name field based on entity
 */
function getEntityFields(entity: QueryEntity): { idField: string; nameField: string; groupBy: string } {
  const entityMap: Record<QueryEntity, { idField: string; nameField: string; groupBy: string }> = {
    pid: { idField: 'pid', nameField: 'pubname', groupBy: 'pid, pubname, pic' },
    mid: { idField: 'mid', nameField: 'medianame', groupBy: 'mid, medianame, pid, pubname, pic' },
    zid: { idField: 'zid', nameField: 'zonename', groupBy: 'zid, zonename, mid, medianame, pid, pubname, pic' },
    team: { idField: 'team', nameField: 'team', groupBy: 'team' },
    pic: { idField: 'pic', nameField: 'pic', groupBy: 'pic' },
    product: { idField: 'product', nameField: 'product', groupBy: 'product' }
  }

  return entityMap[entity] || { idField: entity, nameField: entity, groupBy: entity }
}

/**
 * Build WHERE clause from a single condition
 */
function buildConditionClause(condition: QueryCondition, entity: QueryEntity): string {
  const { type, childEntity, field, operator, value } = condition

  // Determine data type based on field
  const numericFields = ['revenue', 'requests', 'ecpm', 'fill_rate', 'paid', 'rev', 'req', 'pid', 'mid', 'zid']
  const dataType = numericFields.includes(field) ? 'number' : 'string'

  const mainFields = getEntityFields(entity)
  const simpleCondition = buildSimpleCondition(field, operator, value, dataType)

  // Build subquery based on condition type
  // IMPORTANT: Set operations (has/does_not_have/only_has/has_all) ALWAYS use subqueries
  // to avoid impossible conditions like "product='overlay' AND product='flexiblesticky'"
  switch (type) {
    case 'has':
      // Entity HAS at least one child with condition
      return `${mainFields.idField} IN (
        SELECT DISTINCT ${mainFields.idField}
        FROM ${getTableName()}
        WHERE ${simpleCondition}
      )`

    case 'does_not_have':
      // Entity DOES NOT HAVE any child with condition
      return `${mainFields.idField} NOT IN (
        SELECT DISTINCT ${mainFields.idField}
        FROM ${getTableName()}
        WHERE ${simpleCondition}
      )`

    case 'only_has':
      // Entity ONLY HAS children matching condition (and no others)
      return `${mainFields.idField} IN (
        SELECT ${mainFields.idField}
        FROM ${getTableName()}
        GROUP BY ${mainFields.idField}
        HAVING COUNT(DISTINCT CASE WHEN ${simpleCondition} THEN ${mainFields.idField} END) > 0
          AND COUNT(DISTINCT CASE WHEN NOT (${simpleCondition}) THEN ${mainFields.idField} END) = 0
      )`

    case 'has_all':
      // Entity HAS ALL of the specified values
      if (!Array.isArray(value)) {
        throw new Error('has_all requires an array of values')
      }
      return `${mainFields.idField} IN (
        SELECT ${mainFields.idField}
        FROM ${getTableName()}
        WHERE ${field} IN (${value.map(v => escapeSqlValue(v, dataType)).join(', ')})
        GROUP BY ${mainFields.idField}
        HAVING COUNT(DISTINCT ${field}) = ${value.length}
      )`

    default:
      // For simple conditions (no set operations), use direct field filter
      return buildSimpleCondition(field, operator, value, dataType)
  }
}

/**
 * Build simple field condition
 */
function buildSimpleCondition(field: string, operator: string, value: any, dataType: 'string' | 'number'): string {
  switch (operator) {
    case 'equals':
      return `${field} = ${escapeSqlValue(value, dataType)}`

    case 'not_equals':
      return `${field} != ${escapeSqlValue(value, dataType)}`

    case 'in': {
      const values = Array.isArray(value) ? value : [value]
      if (values.length === 0) return '1=0'
      const escapedValues = values.map(v => escapeSqlValue(v, dataType)).join(', ')
      return `${field} IN (${escapedValues})`
    }

    case 'not_in': {
      const values = Array.isArray(value) ? value : [value]
      if (values.length === 0) return '1=1'
      const escapedValues = values.map(v => escapeSqlValue(v, dataType)).join(', ')
      return `${field} NOT IN (${escapedValues})`
    }

    case 'greater_than':
      return `${field} > ${escapeSqlValue(value, dataType)}`

    case 'greater_than_or_equal':
      return `${field} >= ${escapeSqlValue(value, dataType)}`

    case 'less_than':
      return `${field} < ${escapeSqlValue(value, dataType)}`

    case 'less_than_or_equal':
      return `${field} <= ${escapeSqlValue(value, dataType)}`

    case 'between': {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('Between operator requires array of 2 values')
      }
      const [min, max] = value
      return `${field} BETWEEN ${escapeSqlValue(min, dataType)} AND ${escapeSqlValue(max, dataType)}`
    }

    case 'contains':
      return `${field} LIKE ${escapeSqlValue(`%${value}%`, 'string')}`

    case 'not_contains':
      return `${field} NOT LIKE ${escapeSqlValue(`%${value}%`, 'string')}`

    default:
      return '1=1'
  }
}

/**
 * Map user-friendly metric names to SQL column names
 * Handles: revenue → rev, requests → req for all periods
 */
function mapMetricToColumn(metric: string): string {
  // Handle dynamic period metrics (revenue_pN → rev_pN, requests_pN → req_pN)
  const periodMatch = metric.match(/^(revenue|requests)_p(\d+)$/)
  if (periodMatch) {
    const [, metricType, periodNum] = periodMatch
    const columnPrefix = metricType === 'revenue' ? 'rev' : 'req'
    return `${columnPrefix}_p${periodNum}`
  }

  // All other metrics use the same name in SQL
  return metric
}

/**
 * Build WHERE clause for metric filters (applied after aggregation)
 */
function buildMetricFilterClause(filter: MetricFilter): string {
  const { metric, operator, value } = filter

  // Map metric name to SQL column name
  const columnName = mapMetricToColumn(metric)

  const operatorMap: Record<string, string> = {
    greater_than: '>',
    greater_than_or_equal: '>=',
    less_than: '<',
    less_than_or_equal: '<=',
    equals: '=',
    not_equals: '!=',
    between: 'BETWEEN'
  }

  const sqlOperator = operatorMap[operator] || '='

  if (operator === 'between') {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new Error('Between operator requires array of 2 values')
    }
    const [min, max] = value
    return `${columnName} BETWEEN ${min} AND ${max}`
  }

  return `${columnName} ${sqlOperator} ${value}`
}

/**
 * Generate dynamic period metrics for N periods
 */
function generatePeriodMetrics(periods: DateRange[]): string {
  const metrics: string[] = []

  periods.forEach((period, idx) => {
    const periodNum = idx + 1
    const label = period.label || `P${periodNum}`

    metrics.push(`
    -- Period ${periodNum} (${label}: ${period.start} to ${period.end})
    SUM(CASE WHEN DATE >= '${period.start}' AND DATE <= '${period.end}' THEN req ELSE 0 END) as req_p${periodNum},
    SUM(CASE WHEN DATE >= '${period.start}' AND DATE <= '${period.end}' THEN rev ELSE 0 END) as rev_p${periodNum},
    SUM(CASE WHEN DATE >= '${period.start}' AND DATE <= '${period.end}' THEN paid ELSE 0 END) as paid_p${periodNum},
    AVG(CASE WHEN DATE >= '${period.start}' AND DATE <= '${period.end}' THEN CAST(request_CPM as FLOAT64) ELSE NULL END) as ecpm_p${periodNum}`.trim())
  })

  return metrics.join(',\n\n    ')
}

/**
 * Generate calculated fields (fill rate, change %) for N periods
 */
function generateCalculatedFields(periods: DateRange[]): string {
  const calculations: string[] = []

  // Fill rates for each period
  periods.forEach((_, idx) => {
    const periodNum = idx + 1
    calculations.push(`SAFE_DIVIDE(paid_p${periodNum}, req_p${periodNum}) * 100 as fill_rate_p${periodNum}`)
  })

  // Sequential change metrics (p1→p2, p2→p3, etc.)
  if (periods.length >= 2) {
    for (let i = 0; i < periods.length - 1; i++) {
      const prevPeriod = i + 1
      const currPeriod = i + 2

      calculations.push(`
    -- Change from P${prevPeriod} to P${currPeriod}
    SAFE_DIVIDE(rev_p${currPeriod} - rev_p${prevPeriod}, NULLIF(rev_p${prevPeriod}, 0)) * 100 as revenue_change_p${prevPeriod}_to_p${currPeriod},
    SAFE_DIVIDE(req_p${currPeriod} - req_p${prevPeriod}, NULLIF(req_p${prevPeriod}, 0)) * 100 as req_change_p${prevPeriod}_to_p${currPeriod},
    SAFE_DIVIDE(ecpm_p${currPeriod} - ecpm_p${prevPeriod}, NULLIF(ecpm_p${prevPeriod}, 0)) * 100 as ecpm_change_p${prevPeriod}_to_p${currPeriod},
    SAFE_DIVIDE(fill_rate_p${currPeriod} - fill_rate_p${prevPeriod}, NULLIF(fill_rate_p${prevPeriod}, 0)) * 100 as fill_rate_change_p${prevPeriod}_to_p${currPeriod}`.trim())
    }
  }

  // For backward compatibility: if exactly 2 periods, also generate legacy change fields
  if (periods.length === 2) {
    calculations.push(`
    -- Legacy change fields (for backward compatibility)
    SAFE_DIVIDE(rev_p2 - rev_p1, NULLIF(rev_p1, 0)) * 100 as revenue_change_pct,
    SAFE_DIVIDE(req_p2 - req_p1, NULLIF(req_p1, 0)) * 100 as req_change_pct,
    SAFE_DIVIDE(ecpm_p2 - ecpm_p1, NULLIF(ecpm_p1, 0)) * 100 as ecpm_change_pct,
    SAFE_DIVIDE(fill_rate_p2 - fill_rate_p1, NULLIF(fill_rate_p1, 0)) * 100 as fill_rate_change_pct`.trim())
  }

  return calculations.join(',\n    ')
}

/**
 * Generate WHERE clause for date filtering across all periods
 */
function generateDateWhereClause(periods: DateRange[]): string {
  if (periods.length === 0) return '1=1'

  // Find earliest start and latest end across all periods
  const allStarts = periods.map(p => p.start)
  const allEnds = periods.map(p => p.end)
  const earliestStart = allStarts.sort()[0]
  const latestEnd = allEnds.sort().reverse()[0]

  return `DATE >= '${earliestStart}' AND DATE <= '${latestEnd}'`
}

/**
 * Build complete SQL query from QueryConfig
 *
 * @param config - Query configuration
 * @param periodsOrPeriod1 - Array of periods (new) OR period1 (legacy)
 * @param period2 - Period 2 (legacy only, ignored if first param is array)
 */
export function buildQueryLabSQL(
  config: QueryConfig,
  periodsOrPeriod1: DateRange[] | DateRange,
  period2?: DateRange
): string {
  // Migration logic: handle both new array and legacy period1/period2
  let periods: DateRange[]

  if (Array.isArray(periodsOrPeriod1)) {
    // NEW: periods array
    periods = periodsOrPeriod1
  } else if (period2) {
    // LEGACY: period1 + period2
    periods = [periodsOrPeriod1, period2]
  } else {
    // LEGACY: single period
    periods = [periodsOrPeriod1]
  }

  // Validate
  if (periods.length === 0) {
    throw new Error('At least one period is required')
  }
  if (periods.length > 10) {
    throw new Error('Maximum 10 periods allowed')
  }

  const { entity, conditions, metricFilters } = config
  const entityFields = getEntityFields(entity)

  // Build WHERE clause from conditions
  let whereConditions: string[] = []

  // Add period filter (use dynamic date range)
  const dateFilter = generateDateWhereClause(periods)
  whereConditions.push(dateFilter)

  // Add entity conditions
  conditions.forEach((condition, idx) => {
    const clause = buildConditionClause(condition, entity)
    // Always prefix with logic operator since date filter is already in array
    const logic = idx === 0 ? 'AND' : (condition.logic || 'AND')
    whereConditions.push(`${logic} ${clause}`)
  })

  const whereClause = whereConditions.length > 0
    ? whereConditions.join('\n        ')
    : '1=1'

  // Build WHERE clause from metric filters (for already-aggregated data)
  let metricFilterConditions: string[] = []
  metricFilters.forEach((filter, idx) => {
    const clause = buildMetricFilterClause(filter)
    if (idx === 0) {
      metricFilterConditions.push(clause)
    } else {
      const logic = filter.logic || 'AND'
      metricFilterConditions.push(`${logic} ${clause}`)
    }
  })

  const metricWhereClause = metricFilterConditions.length > 0
    ? `WHERE ${metricFilterConditions.join('\n        ')}`
    : ''

  // Generate dynamic period metrics and calculated fields
  const periodMetrics = generatePeriodMetrics(periods)
  const calculatedFields = generateCalculatedFields(periods)

  // Generate SQL with CTEs
  const sql = `
WITH base_data AS (
  SELECT
    ${entityFields.groupBy},

    ${periodMetrics}

  FROM ${getTableName()}
  WHERE ${whereClause}
  GROUP BY ${entityFields.groupBy}
),

calculated AS (
  SELECT
    *,
    ${calculatedFields}

  FROM base_data
)

SELECT *
FROM calculated
${metricWhereClause}
ORDER BY rev_p${periods.length} DESC
LIMIT 10000
  `.trim()

  return sql
}

/**
 * Get column metadata for query results
 */
export function getQueryColumns(entity: QueryEntity, periodCount: number = 2) {
  const columns: any[] = []

  // Get entity field configuration to extract all dimension fields
  const entityFields = getEntityFields(entity)

  // Parse groupBy to extract all dimension field names
  const dimensionFields = entityFields.groupBy.split(',').map(f => f.trim())

  // Add all dimension fields as columns
  dimensionFields.forEach(fieldName => {
    // Create human-readable labels
    const label = fieldName === 'pid' ? 'PID' :
                  fieldName === 'pubname' ? 'Publisher Name' :
                  fieldName === 'mid' ? 'MID' :
                  fieldName === 'medianame' ? 'Media Name' :
                  fieldName === 'zid' ? 'ZID' :
                  fieldName === 'zonename' ? 'Zone Name' :
                  fieldName === 'team' ? 'Team' :
                  fieldName === 'pic' ? 'PIC' :
                  fieldName === 'product' ? 'Product' :
                  fieldName.toUpperCase()

    columns.push({
      name: fieldName,
      label: label,
      type: 'string',
      category: 'dimension'
    })
  })

  // Add team field for entities that have PIC (team will be populated via Supabase mapping)
  if (['pid', 'mid', 'zid'].includes(entity) && !dimensionFields.includes('team')) {
    columns.push({
      name: 'team',
      label: 'Team',
      type: 'string',
      category: 'dimension'
    })
  }

  // Generate period-specific metrics dynamically
  for (let i = 1; i <= periodCount; i++) {
    columns.push(
      { name: `rev_p${i}`, label: `Revenue (P${i})`, type: 'number', category: 'metric' },
      { name: `req_p${i}`, label: `Requests (P${i})`, type: 'number', category: 'metric' },
      { name: `paid_p${i}`, label: `Paid (P${i})`, type: 'number', category: 'metric' },
      { name: `ecpm_p${i}`, label: `eCPM (P${i})`, type: 'number', category: 'metric' },
      { name: `fill_rate_p${i}`, label: `Fill Rate (P${i})`, type: 'number', category: 'calculated' }
    )
  }

  // Generate sequential change metrics
  if (periodCount >= 2) {
    for (let i = 1; i < periodCount; i++) {
      const prev = i
      const curr = i + 1
      columns.push(
        { name: `revenue_change_p${prev}_to_p${curr}`, label: `Revenue Change (P${prev}→P${curr})`, type: 'number', category: 'calculated' },
        { name: `req_change_p${prev}_to_p${curr}`, label: `Request Change (P${prev}→P${curr})`, type: 'number', category: 'calculated' },
        { name: `ecpm_change_p${prev}_to_p${curr}`, label: `eCPM Change (P${prev}→P${curr})`, type: 'number', category: 'calculated' },
        { name: `fill_rate_change_p${prev}_to_p${curr}`, label: `Fill Rate Change (P${prev}→P${curr})`, type: 'number', category: 'calculated' }
      )
    }
  }

  // For backward compatibility: if exactly 2 periods, also include legacy change fields
  if (periodCount === 2) {
    columns.push(
      { name: 'revenue_change_pct', label: 'Revenue Change %', type: 'number', category: 'calculated' },
      { name: 'req_change_pct', label: 'Request Change %', type: 'number', category: 'calculated' },
      { name: 'ecpm_change_pct', label: 'eCPM Change %', type: 'number', category: 'calculated' },
      { name: 'fill_rate_change_pct', label: 'Fill Rate Change %', type: 'number', category: 'calculated' }
    )
  }

  return columns
}
