import { buildTeamCondition, buildTeamConditions, getTeamConfigurations } from '../utils/teamMatcher'
import type { AdvancedFilters, AdvancedFilterClause, AdvancedFilterGroup, SimplifiedFilter, FilterDataType, FilterOperator, FilterField } from '../types/performanceTracker'
import { FIELD_DATA_TYPES } from '../types/performanceTracker'

// Helper function to escape SQL values to prevent injection
function escapeSqlValue(value: any, dataType: FilterDataType): string {
  if (value === null || value === undefined) return 'NULL'

  if (dataType === 'string') {
    // Escape single quotes by doubling them
    return `'${String(value).replace(/'/g, "''")}'`
  }

  if (dataType === 'number') {
    const num = Number(value)
    if (isNaN(num)) throw new Error(`Invalid number value: ${value}`)
    return String(num)
  }

  if (dataType === 'date') {
    // Assume ISO date format YYYY-MM-DD
    return `'${value}'`
  }

  return `'${value}'`
}

/**
 * Format filter value based on field data type from FIELD_DATA_TYPES
 * Numeric fields (pid, mid, zid) -> no quotes: 12345
 * String fields (pic, product, etc.) -> with quotes: '12345'
 */
function formatFilterValue(fieldName: string, value: any): string {
  const fieldType = FIELD_DATA_TYPES[fieldName as FilterField]

  if (!fieldType) {
    // Default to string if not in mapping (backward compatible)
    console.warn(`Field '${fieldName}' not in FIELD_DATA_TYPES, defaulting to string`)
    return `'${String(value).replace(/'/g, "''")}'`
  }

  if (fieldType === 'number') {
    const num = Number(value)
    if (isNaN(num)) {
      throw new Error(`Field '${fieldName}' expects a number but got: ${value}`)
    }
    return String(num)  // No quotes for numeric fields
  }

  // String and date types: escape single quotes and wrap in quotes
  return `'${String(value).replace(/'/g, "''")}'`
}

// Determine entity field for entity-level filtering
// Based on the table structure, we aggregate by MID for most entity operations
function getEntityField(): string {
  return 'mid'  // Default to MID for entity-level aggregation
}

// Helper function to build simple condition for entity operator subqueries
function buildSimpleCondition(field: FilterField, operator: FilterOperator, value: any, dataType: FilterDataType): string {
  switch (operator) {
    case 'equals':
      return `${field} = ${escapeSqlValue(value, dataType)}`

    case 'in': {
      const values = Array.isArray(value) ? value : [value]
      if (values.length === 0) return '1=0' // No match
      const escapedValues = values.map(v => escapeSqlValue(v, dataType)).join(', ')
      return `${field} IN (${escapedValues})`
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
      return `${field} LIKE ${escapeSqlValue(`%${value}%`, dataType)}`

    case 'starts_with':
      return `${field} LIKE ${escapeSqlValue(`${value}%`, dataType)}`

    case 'ends_with':
      return `${field} LIKE ${escapeSqlValue(`%${value}`, dataType)}`

    case 'is_null':
      return `${field} IS NULL`

    case 'is_not_null':
      return `${field} IS NOT NULL`

    default:
      throw new Error(`Unsupported operator for simple condition: ${operator}`)
  }
}

// Build SQL condition for a single advanced filter clause
async function buildClauseCondition(clause: AdvancedFilterClause, tableName?: string): Promise<string | null> {
  const { field, operator, value, dataType, enabled, attributeField, attributeDataType, condition } = clause

  if (!enabled) return null

  // Use default table if not provided
  const table = tableName || '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'

  try {
    // Check if this is an entity operator (Branch 1)
    if (['has', 'does_not_have', 'only_has', 'has_all', 'has_any'].includes(operator)) {
      // Entity cross-reference: field + operator + attributeField + condition + value
      if (!attributeField || !condition || !attributeDataType) {
        console.warn(`Entity operator ${operator} requires attributeField, condition, and attributeDataType`)
        return null
      }

      // Build the condition for the subquery
      const subqueryCondition = buildSimpleCondition(attributeField, condition, value, attributeDataType)

      switch (operator) {
        case 'has':
          // Entity has attribute matching condition
          // Example: zid has product equals 'video'
          // SQL: zid IN (SELECT DISTINCT zid FROM table WHERE product = 'video')
          return `${field} IN (SELECT DISTINCT ${field} FROM ${table} WHERE ${subqueryCondition})`

        case 'does_not_have':
          // Entity does not have attribute matching condition
          // Example: mid does not have product equals 'flexiblesticky'
          // SQL: mid NOT IN (SELECT DISTINCT mid FROM table WHERE product = 'flexiblesticky')
          return `${field} NOT IN (SELECT DISTINCT ${field} FROM ${table} WHERE ${subqueryCondition})`

        case 'only_has': {
          // Entity ONLY has these values (no other values)
          // Example: zid only has product in ['video', 'standardbanner']
          const values = Array.isArray(value) ? value : [value]
          if (values.length === 0) return null
          const escapedValues = values.map(v => escapeSqlValue(v, attributeDataType)).join(', ')
          return `${field} IN (
            SELECT ${field}
            FROM ${table}
            WHERE ${attributeField} IS NOT NULL
            GROUP BY ${field}
            HAVING COUNT(DISTINCT ${attributeField}) = ${values.length}
              AND SUM(CASE WHEN ${attributeField} IN (${escapedValues}) THEN 1 ELSE 0 END) = COUNT(DISTINCT ${attributeField})
          )`
        }

        case 'has_all': {
          // Entity has ALL of these values (may have others too)
          // Example: mid has all product in ['video', 'standardbanner']
          const values = Array.isArray(value) ? value : [value]
          if (values.length === 0) return null
          const escapedValues = values.map(v => escapeSqlValue(v, attributeDataType)).join(', ')
          return `${field} IN (
            SELECT ${field}
            FROM ${table}
            WHERE ${attributeField} IN (${escapedValues})
            GROUP BY ${field}
            HAVING COUNT(DISTINCT ${attributeField}) = ${values.length}
          )`
        }

        case 'has_any': {
          // Entity has ANY of these values
          // Example: zid has any product in ['video', 'flexiblesticky']
          const values = Array.isArray(value) ? value : [value]
          if (values.length === 0) return null
          const escapedValues = values.map(v => escapeSqlValue(v, attributeDataType)).join(', ')
          return `${field} IN (SELECT DISTINCT ${field} FROM ${table} WHERE ${attributeField} IN (${escapedValues}))`
        }

        default:
          console.warn(`Unknown entity operator: ${operator}`)
          return null
      }
    }

    // Branch 2: Direct operators (field + operator + value)
    switch (operator) {
      case 'equals':
        return `${field} = ${escapeSqlValue(value, dataType)}`

      case 'in': {
        const values = Array.isArray(value) ? value : [value]
        if (values.length === 0) return null
        const escapedValues = values.map(v => escapeSqlValue(v, dataType)).join(', ')
        return `${field} IN (${escapedValues})`
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
        return `${field} LIKE ${escapeSqlValue(`%${value}%`, dataType)}`

      case 'starts_with':
        return `${field} LIKE ${escapeSqlValue(`${value}%`, dataType)}`

      case 'ends_with':
        return `${field} LIKE ${escapeSqlValue(`%${value}`, dataType)}`

      case 'regex_match':
        // BigQuery regex syntax
        return `REGEXP_CONTAINS(${field}, r'${String(value).replace(/'/g, "\\'")}')`

      case 'is_null':
        return `${field} IS NULL`

      case 'is_not_null':
        return `${field} IS NOT NULL`

      // Legacy entity operators (backward compatibility - now deprecated)
      case 'entity_has' as any: {
        const entityField = getEntityField()
        const escapedValue = escapeSqlValue(value, dataType)
        return `${entityField} IN (SELECT DISTINCT ${entityField} FROM ${table} WHERE ${field} = ${escapedValue})`
      }

      case 'entity_not_has' as any: {
        const entityField = getEntityField()
        const escapedValue = escapeSqlValue(value, dataType)
        return `${entityField} NOT IN (SELECT DISTINCT ${entityField} FROM ${table} WHERE ${field} = ${escapedValue})`
      }

      case 'entity_only_has' as any: {
        const entityField = getEntityField()
        const values = Array.isArray(value) ? value : [value]
        if (values.length === 0) return null
        const escapedValues = values.map(v => escapeSqlValue(v, dataType)).join(', ')
        return `${entityField} IN (
          SELECT ${entityField}
          FROM ${table}
          WHERE ${field} IS NOT NULL
          GROUP BY ${entityField}
          HAVING COUNT(DISTINCT ${field}) = ${values.length}
            AND SUM(CASE WHEN ${field} IN (${escapedValues}) THEN 1 ELSE 0 END) = COUNT(DISTINCT ${field})
        )`
      }

      case 'entity_has_all' as any: {
        const entityField = getEntityField()
        const values = Array.isArray(value) ? value : [value]
        if (values.length === 0) return null
        const escapedValues = values.map(v => escapeSqlValue(v, dataType)).join(', ')
        return `${entityField} IN (
          SELECT ${entityField}
          FROM ${table}
          WHERE ${field} IN (${escapedValues})
          GROUP BY ${entityField}
          HAVING COUNT(DISTINCT ${field}) = ${values.length}
        )`
      }

      case 'entity_has_any' as any: {
        const entityField = getEntityField()
        const values = Array.isArray(value) ? value : [value]
        if (values.length === 0) return null
        const escapedValues = values.map(v => escapeSqlValue(v, dataType)).join(', ')
        return `${entityField} IN (SELECT DISTINCT ${entityField} FROM ${table} WHERE ${field} IN (${escapedValues}))`
      }

      default:
        console.warn(`Unknown operator: ${operator}`)
        return null
    }
  } catch (error) {
    console.error(`Error building clause condition for field ${field}:`, error)
    return null
  }
}

// Build WHERE clause from simplified filter (Looker Studio-style)
export async function buildSimplifiedWhereClause(filter: SimplifiedFilter): Promise<string> {
  console.log('[buildSimplifiedWhereClause] Input filter:', JSON.stringify(filter, null, 2))
  const clauseConditions: string[] = []

  // Group team clauses together to handle multiple team filters properly
  const teamClauses = filter.clauses.filter(c => c.field === 'team' && c.enabled && (c.operator === 'in' || c.operator === 'equals'))
  const otherClauses = filter.clauses.filter(c => !(c.field === 'team' && c.enabled && (c.operator === 'in' || c.operator === 'equals')))

  // Handle team clauses as a group
  if (teamClauses.length > 0) {
    const allTeamValues: string[] = []
    for (const clause of teamClauses) {
      const teamValues = Array.isArray(clause.value) ? clause.value : [clause.value]
      allTeamValues.push(...teamValues)
    }

    if (allTeamValues.length > 0) {
      const teamCondition = allTeamValues.length === 1
        ? await buildTeamCondition(allTeamValues[0])
        : await buildTeamConditions(allTeamValues)
      if (teamCondition) {
        clauseConditions.push(teamCondition)
      }
    }
  }

  // Handle other clauses normally
  for (const clause of otherClauses) {
    if (!clause.enabled) continue

    if (clause.field === 'team') {
      // Non-equals/in team operators (e.g., contains, starts_with)
      const condition = await buildClauseCondition(clause)
      if (condition) {
        clauseConditions.push(condition)
      }
    } else {
      const condition = await buildClauseCondition(clause)
      if (condition) {
        clauseConditions.push(condition)
      }
    }
  }

  if (clauseConditions.length === 0) {
    return ''
  }

  // Combine clauses with logic (AND/OR)
  const combinedConditions = clauseConditions.join(` ${filter.clauseLogic} `)
  console.log('[buildSimplifiedWhereClause] Combined conditions:', combinedConditions)

  // Wrap with INCLUDE/EXCLUDE logic
  let finalClause = ''
  if (filter.includeExclude === 'EXCLUDE') {
    finalClause = `NOT (${combinedConditions})`
  } else {
    finalClause = `(${combinedConditions})`
  }

  console.log('[buildSimplifiedWhereClause] Final clause:', finalClause)
  return finalClause
}

// Build WHERE clause from advanced filters (legacy)
export async function buildAdvancedWhereClause(advancedFilters: AdvancedFilters): Promise<string> {
  const groupConditions: string[] = []

  for (const group of advancedFilters.groups) {
    const clauseConditions: string[] = []

    for (const clause of group.clauses) {
      // Handle team filter specially (it needs teamMatcher logic)
      if (clause.field === 'team' && clause.enabled) {
        if (clause.operator === 'in' || clause.operator === 'equals') {
          const teamValues = Array.isArray(clause.value) ? clause.value : [clause.value]
          if (teamValues.length > 0) {
            const teamCondition = teamValues.length === 1
              ? await buildTeamCondition(teamValues[0])
              : await buildTeamConditions(teamValues)
            if (teamCondition) {
              clauseConditions.push(teamCondition)
            }
          }
        } else if (clause.operator === 'not_in' || clause.operator === 'not_equals') {
          // For NOT logic, we need to negate the team condition
          const teamValues = Array.isArray(clause.value) ? clause.value : [clause.value]
          if (teamValues.length > 0) {
            const teamCondition = teamValues.length === 1
              ? await buildTeamCondition(teamValues[0])
              : await buildTeamConditions(teamValues)
            if (teamCondition) {
              clauseConditions.push(`NOT (${teamCondition})`)
            }
          }
        } else {
          // For other team operators, fall back to default logic
          const condition = await buildClauseCondition(clause)
          if (condition) {
            clauseConditions.push(condition)
          }
        }
      } else {
        const condition = await buildClauseCondition(clause)
        if (condition) {
          clauseConditions.push(condition)
        }
      }
    }

    if (clauseConditions.length > 0) {
      const groupCondition = clauseConditions.join(` ${group.logic} `)
      groupConditions.push(`(${groupCondition})`)
    }
  }

  if (groupConditions.length === 0) {
    return ''
  }

  return groupConditions.join(` ${advancedFilters.groupLogic} `)
}

// Helper function to build WHERE clauses from filters (supports simple, simplified, and advanced filters)
export async function buildWhereClause(
  filters: Record<string, any>,
  options?: {
    skipDateFilter?: boolean
    skipRevFlagFilter?: boolean
    advancedFilters?: AdvancedFilters  // Legacy format
    simplifiedFilter?: SimplifiedFilter  // New Looker Studio-style format
  }
): Promise<string> {
  const conditions: string[] = []

  // Process simplified filter first (takes precedence over legacy advanced filters)
  if (options?.simplifiedFilter) {
    const simplifiedConditions = await buildSimplifiedWhereClause(options.simplifiedFilter)
    if (simplifiedConditions) {
      conditions.push(simplifiedConditions)
    }
  }
  // Process legacy advanced filters if no simplified filter provided
  else if (options?.advancedFilters) {
    const advancedConditions = await buildAdvancedWhereClause(options.advancedFilters)
    if (advancedConditions) {
      conditions.push(advancedConditions)
    }
  }

  // Skip date filter for tables without DATE column (e.g., prediction tables)
  if (filters.startDate && filters.endDate && !options?.skipDateFilter) {
    conditions.push(`DATE >= '${filters.startDate}' AND DATE <= '${filters.endDate}'`)
  }

  // Handle specific date filter (for cross-filtering by date)
  if (filters.date) {
    if (Array.isArray(filters.date) && filters.date.length > 0) {
      const values = filters.date.map(v => `'${v}'`).join(', ')
      conditions.push(`DATE IN (${values})`)
    } else if (filters.date !== '') {
      conditions.push(`DATE = '${filters.date}'`)
    }
  }

  // Handle team filter with dynamic configuration from Supabase
  if (filters.team) {
    console.log('[buildWhereClause] Team filter detected:', filters.team)
    if (Array.isArray(filters.team) && filters.team.length > 0) {
      const teamCondition = await buildTeamConditions(filters.team)
      console.log('[buildWhereClause] Team condition (array):', teamCondition)
      if (teamCondition) {
        conditions.push(teamCondition)
      }
    } else if (filters.team !== '') {
      const teamCondition = await buildTeamCondition(filters.team)
      console.log('[buildWhereClause] Team condition (single):', teamCondition)
      if (teamCondition) {
        conditions.push(teamCondition)
      }
    }
  }

  if (filters.pic) {
    if (Array.isArray(filters.pic) && filters.pic.length > 0) {
      const values = filters.pic.map(v => `'${v}'`).join(', ')
      conditions.push(`pic IN (${values})`)
    } else if (filters.pic !== '') {
      conditions.push(`pic = '${filters.pic}'`)
    }
  }

  if (filters.product) {
    if (Array.isArray(filters.product) && filters.product.length > 0) {
      const values = filters.product.map(v => `'${v}'`).join(', ')
      conditions.push(`product IN (${values})`)
    } else if (filters.product !== '') {
      conditions.push(`product = '${filters.product}'`)
    }
  }

  if (filters.pid) {
    if (Array.isArray(filters.pid) && filters.pid.length > 0) {
      const values = filters.pid.map(v => formatFilterValue('pid', v)).join(', ')
      conditions.push(`pid IN (${values})`)
    } else if (filters.pid !== '') {
      conditions.push(`pid = ${formatFilterValue('pid', filters.pid)}`)
    }
  }

  if (filters.mid) {
    if (Array.isArray(filters.mid) && filters.mid.length > 0) {
      const values = filters.mid.map(v => formatFilterValue('mid', v)).join(', ')
      conditions.push(`mid IN (${values})`)
    } else if (filters.mid !== '') {
      conditions.push(`mid = ${formatFilterValue('mid', filters.mid)}`)
    }
  }

  if (filters.pubname) {
    if (Array.isArray(filters.pubname) && filters.pubname.length > 0) {
      const values = filters.pubname.map(v => `'${v}'`).join(', ')
      conditions.push(`pubname IN (${values})`)
    } else if (filters.pubname !== '') {
      conditions.push(`pubname = '${filters.pubname}'`)
    }
  }

  if (filters.medianame) {
    if (Array.isArray(filters.medianame) && filters.medianame.length > 0) {
      const values = filters.medianame.map(v => `'${v}'`).join(', ')
      conditions.push(`medianame IN (${values})`)
    } else if (filters.medianame !== '') {
      conditions.push(`medianame = '${filters.medianame}'`)
    }
  }

  if (filters.zid) {
    if (Array.isArray(filters.zid) && filters.zid.length > 0) {
      const values = filters.zid.map(v => formatFilterValue('zid', v)).join(', ')
      conditions.push(`zid IN (${values})`)
    } else if (filters.zid !== '') {
      conditions.push(`zid = ${formatFilterValue('zid', filters.zid)}`)
    }
  }

  if (filters.zonename) {
    if (Array.isArray(filters.zonename) && filters.zonename.length > 0) {
      const values = filters.zonename.map(v => `'${v}'`).join(', ')
      conditions.push(`zonename IN (${values})`)
    } else if (filters.zonename !== '') {
      conditions.push(`zonename = '${filters.zonename}'`)
    }
  }

  if (filters.h5) {
    if (Array.isArray(filters.h5) && filters.h5.length > 0) {
      const values = filters.h5.map(v => `'${v}'`).join(', ')
      conditions.push(`h5 IN (${values})`)
    } else if (filters.h5 !== '') {
      conditions.push(`h5 = '${filters.h5}'`)
    }
  }

  // Skip rev_flag filter for tables without rev_flag column (e.g., agg_monthly_with_pic_table_6_month)
  if (filters.rev_flag && !options?.skipRevFlagFilter) {
    if (Array.isArray(filters.rev_flag) && filters.rev_flag.length > 0) {
      const values = filters.rev_flag.map(v => `'${v}'`).join(', ')
      conditions.push(`rev_flag IN (${values})`)
    } else if (filters.rev_flag !== '') {
      conditions.push(`rev_flag = '${filters.rev_flag}'`)
    }
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
}

// Business Health queries
export function getBusinessHealthQueries(whereClause: string, options?: { offset?: number; limit?: number }) {
  const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 500

  return {
    metrics: `
      SELECT
        SUM(rev) as total_revenue,
        SUM(profit) as total_profit,
        SUM(paid) as total_paid,
        SUM(req) as total_requests
      FROM ${tableName}
      ${whereClause}
    `,

    timeSeries: `
      SELECT
        DATE as date,
        SUM(rev) as revenue,
        SUM(profit) as profit
      FROM ${tableName}
      ${whereClause}
      GROUP BY DATE
      ORDER BY DATE ASC
    `,

    topPublishers: `
      SELECT
        pubname,
        SUM(rev) as revenue
      FROM ${tableName}
      ${whereClause}
      GROUP BY pubname
      ORDER BY revenue DESC
      LIMIT 10
    `,

    topMedia: `
      SELECT
        medianame,
        SUM(rev) as revenue
      FROM ${tableName}
      ${whereClause}
      GROUP BY medianame
      ORDER BY revenue DESC
      LIMIT 10
    `,

    topZones: `
      SELECT
        zonename,
        SUM(rev) as revenue
      FROM ${tableName}
      ${whereClause}
      GROUP BY zonename
      ORDER BY revenue DESC
      LIMIT 10
    `,

    topEcpm: `
      SELECT
        zonename,
        AVG(CAST(request_CPM as FLOAT64)) as ecpm
      FROM ${tableName}
      ${whereClause}
      GROUP BY zonename
      ORDER BY AVG(CAST(request_CPM as FLOAT64)) DESC
      LIMIT 10
    `,

    zoneMonitoring: `
      SELECT
        zid,
        zonename,
        product,
        SUM(req) as req,
        ROUND(SUM(paid) / NULLIF(SUM(req), 0), 2) as fill_rate,
        AVG(CAST(request_CPM as FLOAT64)) as request_CPM,
        SUM(rev) as rev,
        SUM(profit) as profit,
        SUM(rev) - SUM(profit) as rev_to_pub
      FROM ${tableName}
      ${whereClause}
      GROUP BY zid, zonename, product
      ORDER BY rev DESC
    `,

    profitRate: `
      SELECT
        ROUND(SUM(profit) / NULLIF(SUM(rev), 0) * 100, 1) as profit_rate
      FROM ${tableName}
      ${whereClause}
    `,

    productTrend: `
      SELECT
        DATE as date,
        product,
        SUM(profit) as profit,
        SUM(rev) as revenue,
        SUM(paid) as paid,
        SUM(req) as requests,
        AVG(CAST(request_CPM as FLOAT64)) as ecpm
      FROM ${tableName}
      ${whereClause}
      GROUP BY DATE, product
      ORDER BY DATE ASC
    `,

    zoneMonitoringTimeSeries: `
      SELECT * FROM (
        SELECT
          DATE as date,
          pic,
          pid,
          mid,
          zid,
          zonename,
          product,
          SUM(req) as req,
          ROUND(SUM(paid) / NULLIF(SUM(req), 0), 2) as fill_rate,
          AVG(CAST(request_CPM as FLOAT64)) as request_CPM,
          SUM(rev) as rev,
          SUM(profit) as profit,
          SUM(rev) - SUM(profit) as rev_to_pub,
          ROW_NUMBER() OVER (PARTITION BY DATE ORDER BY SUM(rev) DESC) as rn
        FROM ${tableName}
        ${whereClause}
        GROUP BY DATE, pic, pid, mid, zid, zonename, product
      ) ranked
      WHERE rn <= 150
      ORDER BY date ASC, rev DESC
    `,

    zoneMonitoringTimeSeriesCount: `
      SELECT
        COUNT(*) as total_count
      FROM (
        SELECT
          DATE,
          zid,
          zonename,
          product
        FROM ${tableName}
        ${whereClause}
        GROUP BY DATE, zid, zonename, product
      ) AS subquery
    `,

    listOfPid: `
      SELECT
        pid,
        pubname,
        SUM(rev) as rev,
        SUM(profit) as profit,
        SUM(rev) - SUM(profit) as rev_to_pub
      FROM ${tableName}
      ${whereClause}
      GROUP BY pid, pubname
      ORDER BY rev DESC
      LIMIT ${limit} OFFSET ${offset}
    `,

    listOfPidCount: `
      SELECT
        COUNT(*) as total_count
      FROM (
        SELECT
          pid,
          pubname
        FROM ${tableName}
        ${whereClause}
        GROUP BY pid, pubname
      ) AS subquery
    `,

    listOfPidByDate: `
      SELECT * FROM (
        SELECT
          DATE as date,
          pic,
          pid,
          pubname,
          SUM(rev) as rev,
          SUM(profit) as profit,
          SUM(rev) - SUM(profit) as rev_to_pub,
          ROW_NUMBER() OVER (PARTITION BY DATE ORDER BY SUM(rev) DESC) as rn
        FROM ${tableName}
        ${whereClause}
        GROUP BY DATE, pic, pid, pubname
      ) ranked
      WHERE rn <= 100
      ORDER BY date ASC, rev DESC
    `,

    listOfPidByDateCount: `
      SELECT
        COUNT(*) as total_count
      FROM (
        SELECT
          DATE,
          pid,
          pubname
        FROM ${tableName}
        ${whereClause}
        GROUP BY DATE, pid, pubname
      ) AS subquery
    `,

    listOfMid: `
      SELECT
        mid,
        medianame,
        SUM(rev) as rev,
        SUM(profit) as profit,
        SUM(rev) - SUM(profit) as rev_to_pub
      FROM ${tableName}
      ${whereClause}
      GROUP BY mid, medianame
      ORDER BY rev DESC
      LIMIT ${limit} OFFSET ${offset}
    `,

    listOfMidCount: `
      SELECT
        COUNT(*) as total_count
      FROM (
        SELECT
          mid,
          medianame
        FROM ${tableName}
        ${whereClause}
        GROUP BY mid, medianame
      ) AS subquery
    `,

    listOfMidByDate: `
      SELECT * FROM (
        SELECT
          DATE as date,
          pic,
          pid,
          mid,
          medianame,
          SUM(rev) as rev,
          SUM(profit) as profit,
          SUM(rev) - SUM(profit) as rev_to_pub,
          ROW_NUMBER() OVER (PARTITION BY DATE ORDER BY SUM(rev) DESC) as rn
        FROM ${tableName}
        ${whereClause}
        GROUP BY DATE, pic, pid, mid, medianame
      ) ranked
      WHERE rn <= 100
      ORDER BY date ASC, rev DESC
    `,

    listOfMidByDateCount: `
      SELECT
        COUNT(*) as total_count
      FROM (
        SELECT
          DATE,
          mid,
          medianame
        FROM ${tableName}
        ${whereClause}
        GROUP BY DATE, mid, medianame
      ) AS subquery
    `,
  }
}

// Daily Ops queries - Metrics from main table (yesterday only)
export function getDailyOpsMetricsQuery(whereClause: string) {
  const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'

  // Build WHERE clause with yesterday's date
  const dateFilter = `DATE = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)`
  const fullWhere = whereClause
    ? `WHERE ${dateFilter} AND ${whereClause.replace('WHERE ', '')}`
    : `WHERE ${dateFilter}`

  return `
    SELECT
      SUM(rev) as yesterday_revenue,
      SUM(profit) as yesterday_profit,
      AVG(CAST(request_CPM as FLOAT64)) as ecpm,
      SUM(req) as yesterday_requests,
      SUM(paid) as yesterday_serve,
      COUNT(DISTINCT pid) as active_clients
    FROM ${tableName}
    ${fullWhere}
  `
}

// Daily Ops queries - Tables from top_movers_daily (deprecated - use getDailyOpsQueriesPaginated)
export function getDailyOpsQueries(whereClause: string) {
  const tableName = '`gcpp-check.GI_publisher.top_movers_daily`'

  return {
    topMovers: `
      SELECT
        pic,
        zonename,
        req_flag,
        paid_flag,
        cpm_flag,
        rev_flag
      FROM ${tableName}
      ${whereClause}
      ORDER BY ABS(rev_change_pct) DESC
      LIMIT 100
    `,

    topMoversDetails: `
      SELECT
        zid,
        zonename,
        req_7d_avg,
        req_yesterday,
        paid_7d_avg,
        paid_yesterday,
        cpm_7d_avg,
        cpm_yesterday,
        rev_7d_avg,
        rev_yesterday
      FROM ${tableName}
      ${whereClause}
      ORDER BY ABS(rev_yesterday - rev_7d_avg) DESC
      LIMIT 100
    `,
  }
}

// Daily Ops paginated queries - with LIMIT/OFFSET support
export function getDailyOpsQueriesPaginated(whereClause: string, options: { offset?: number; limit?: number } = {}) {
  const tableName = '`gcpp-check.GI_publisher.top_movers_daily`'
  const { offset = 0, limit = 500 } = options

  return {
    topMovers: `
      SELECT
        pic,
        zonename,
        req_flag,
        paid_flag,
        cpm_flag,
        rev_flag
      FROM ${tableName}
      ${whereClause}
      ORDER BY ABS(rev_change_pct) DESC
      LIMIT ${limit} OFFSET ${offset}
    `,

    topMoversCount: `
      SELECT
        COUNT(*) as total_count
      FROM ${tableName}
      ${whereClause}
    `,

    topMoversDetails: `
      SELECT
        zid,
        zonename,
        req_7d_avg,
        req_yesterday,
        paid_7d_avg,
        paid_yesterday,
        cpm_7d_avg,
        cpm_yesterday,
        rev_7d_avg,
        rev_yesterday
      FROM ${tableName}
      ${whereClause}
      ORDER BY ABS(rev_yesterday - rev_7d_avg) DESC
      LIMIT ${limit} OFFSET ${offset}
    `,

    topMoversDetailsCount: `
      SELECT
        COUNT(*) as total_count
      FROM ${tableName}
      ${whereClause}
    `,
  }
}

// Projections queries
export function getProjectionQueries(filterType: string, whereClause?: string) {
  const tableName = '`gcpp-check.GI_publisher.weekly_prediction_table`'

  let selectColumns = 'pic, pid, pubname'
  let groupByColumns = 'pic, pid, pubname'

  if (filterType === 'mid') {
    // Add pic for cross-filtering with PID table
    selectColumns = 'pic, pid, mid, medianame'
    groupByColumns = 'pic, pid, mid, medianame'
  } else if (filterType === 'zid') {
    // Add pic and pid for cross-filtering with PID and MID tables
    selectColumns = 'pic, pid, mid, zid, zonename'
    groupByColumns = 'pic, pid, mid, zid, zonename'
  }

  return {
    predictions: `
      SELECT
        ${selectColumns},
        SUM(last_month_profit) as last_month_profit,
        SUM(w1_profit) as w1_profit,
        SUM(w2_profit) as w2_profit,
        SUM(w3_profit) as w3_profit,
        SUM(w4_profit) as w4_profit,
        SUM(w5_profit) as w5_profit,
        SUM(mom_profit) as mom_profit,
        SUM(wow_profit) as wow_profit,
        SUM(last_month_rev) as last_month_rev,
        SUM(w1_rev) as w1_rev,
        SUM(w2_rev) as w2_rev,
        SUM(w3_rev) as w3_rev,
        SUM(w4_rev) as w4_rev,
        SUM(w5_rev) as w5_rev,
        SUM(mom_rev) as mom_rev,
        SUM(wow_rev) as wow_rev
      FROM ${tableName}
      ${whereClause || ''}
      GROUP BY ${groupByColumns}
      ORDER BY last_month_profit DESC
    `,
  }
}

// Daily Ops Publisher Summary queries
export async function getDailyOpsPublisherQueries(filters: Record<string, any>) {
  const customerTable = '`gcpp-check.GI_publisher.customer_summary_dashboard`'
  const mediaTable = '`gcpp-check.GI_publisher.media_summary_dashboard`'
  const newZoneTable = '`gcpp-check.GI_publisher.new_zone_active`'
  const aggMonthlyTable = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'
  const closeWonTable = '`gcpp-check.GI_publisher.close_won_cases`'

  // Build filter conditions
  const buildFilterConditions = async (fields: string[]) => {
    const conditions: string[] = []

    // Handle team filter with dynamic configuration from Supabase
    if (filters.team) {
      if (Array.isArray(filters.team) && filters.team.length > 0) {
        const teamCondition = await buildTeamConditions(filters.team)
        if (teamCondition) {
          conditions.push(teamCondition)
        }
      } else if (filters.team !== '') {
        const teamCondition = await buildTeamCondition(filters.team)
        if (teamCondition) {
          conditions.push(teamCondition)
        }
      }
    }

    if (filters.pic) {
      if (Array.isArray(filters.pic) && filters.pic.length > 0) {
        const values = filters.pic.map((v: string) => `'${v}'`).join(', ')
        conditions.push(`pic IN (${values})`)
      } else if (filters.pic !== '') {
        conditions.push(`pic = '${filters.pic}'`)
      }
    }

    if (filters.revenue_tier && fields.includes('revenue_tier')) {
      if (Array.isArray(filters.revenue_tier) && filters.revenue_tier.length > 0) {
        const values = filters.revenue_tier.map((v: string) => `'${v}'`).join(', ')
        conditions.push(`revenue_tier IN (${values})`)
      } else if (filters.revenue_tier !== '') {
        conditions.push(`revenue_tier = '${filters.revenue_tier}'`)
      }
    }

    if (filters.product && fields.includes('product')) {
      if (Array.isArray(filters.product) && filters.product.length > 0) {
        const values = filters.product.map((v: string) => `'${v}'`).join(', ')
        conditions.push(`product IN (${values})`)
      } else if (filters.product !== '') {
        conditions.push(`product = '${filters.product}'`)
      }
    }

    if (filters.month && fields.includes('month')) {
      conditions.push(`month = ${filters.month}`)
    }

    if (filters.year && fields.includes('year')) {
      conditions.push(`year = ${filters.year}`)
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  }

  // Get yesterday's date for high-traffic zones
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDate = yesterday.toISOString().split('T')[0]

  // Pre-build all filter conditions
  const filterRevenueTier = await buildFilterConditions(['revenue_tier'])
  const filterProduct = await buildFilterConditions(['product'])
  const filterMonthYear = await buildFilterConditions(['month', 'year'])

  return {
    // Tab 1: Publisher Summary
    publisherSummary: `
      SELECT
        category,
        revenue_tier,
        COUNT(DISTINCT pid) as pid
      FROM ${customerTable}
      ${filterRevenueTier}
      GROUP BY category, revenue_tier
      ORDER BY
        CASE category
          WHEN 'Active' THEN 1
          WHEN 'New Onboarding' THEN 2
          WHEN 'Churn' THEN 3
          WHEN 'Inactive' THEN 4
          ELSE 5
        END,
        CASE revenue_tier
          WHEN '>10000' THEN 1
          WHEN '3001–10000' THEN 2
          WHEN '1001–3000' THEN 3
          WHEN '10–1000' THEN 4
          WHEN '<10' THEN 5
          ELSE 6
        END
    `,

    publisherDetail: `
      SELECT
        pubname,
        revenue_tier,
        category,
        ROUND(CAST(projected_revenue AS FLOAT64), 2) as projected_revenue,
        ROUND(CAST(last_month_revenue AS FLOAT64), 2) as last_month_revenue
      FROM ${customerTable}
      ${filterRevenueTier}
      ORDER BY projected_revenue DESC
      LIMIT 500
    `,

    // Tab 1: Media Summary
    mediaSummary: `
      SELECT
        category,
        revenue_tier,
        COUNT(DISTINCT mid) as mid
      FROM ${mediaTable}
      ${filterRevenueTier}
      GROUP BY category, revenue_tier
      ORDER BY
        CASE category
          WHEN 'Active' THEN 1
          WHEN 'New Onboarding' THEN 2
          WHEN 'Churn' THEN 3
          WHEN 'Inactive' THEN 4
          ELSE 5
        END,
        CASE revenue_tier
          WHEN '>10000' THEN 1
          WHEN '3001–10000' THEN 2
          WHEN '1001–3000' THEN 3
          WHEN '10–1000' THEN 4
          WHEN '<10' THEN 5
          ELSE 6
        END
    `,

    mediaDetail: `
      SELECT
        medianame,
        pubname,
        revenue_tier,
        category,
        ROUND(CAST(projected_revenue AS FLOAT64), 2) as projected_revenue,
        ROUND(CAST(last_month_revenue AS FLOAT64), 2) as last_month_revenue
      FROM ${mediaTable}
      ${filterRevenueTier}
      ORDER BY projected_revenue DESC
      LIMIT 500
    `,

    // Tab 2: New Zones Active
    newZones: `
      SELECT
        zid,
        zonename,
        product,
        req_yesterday,
        ROUND(CAST(rev_yesterday AS FLOAT64), 2) as rev_yesterday
      FROM ${newZoneTable}
      ${filterProduct}
      ORDER BY req_yesterday DESC
      LIMIT 500
    `,

    // Tab 2: 50k ad request zones (yesterday only, req > 50k)
    highTrafficZones: `
      SELECT
        zid,
        zonename,
        req,
        ROUND(rev, 2) as rev,
        ROUND((rev / NULLIF(req, 0)) * 1000, 2) as request_CPM
      FROM ${aggMonthlyTable}
      WHERE DATE = '${yesterdayDate}'
      ${filterProduct.replace('WHERE', 'AND')}
      AND req > 50000
      ORDER BY req DESC
      LIMIT 500
    `,

    // Tab 3: Close Won Cases
    closeWonCases: `
      SELECT
        month,
        year,
        pic,
        mid,
        media_name,
        day_start,
        close_won_day,
        total_req,
        ROUND(CAST(total_profit AS FLOAT64), 2) as total_profit,
        ROUND(CAST(total_revenue AS FLOAT64), 2) as total_revenue
      FROM ${closeWonTable}
      ${filterMonthYear}
      ORDER BY close_won_day DESC
      LIMIT 500
    `
  }
}

// New Sales queries
export async function getNewSalesQueries(filters: Record<string, any>) {
  const newSalesMasterTable = '`gcpp-check.GI_publisher.new_sales_master`'
  const finalSalesMonthlyTable = '`gcpp-check.GI_publisher.final_sales_monthly`'
  const newSalesByPidTable = '`gcpp-check.GI_publisher.newsales_by_pid`'

  // Build WHERE clauses for different tables
  // Note: These tables don't have a DATE column, so we skip date filtering for the table queries
  // Instead we use start_date and end_date for filtering
  const conditions: string[] = []

  // Handle date range filter for start_date and end_date
  if (filters.startDate && filters.endDate) {
    // Filter where the contract period overlaps with the selected date range
    conditions.push(`(start_date <= '${filters.endDate}' AND end_date >= '${filters.startDate}')`)
  }

  // Handle team filter
  if (filters.team) {
    if (Array.isArray(filters.team) && filters.team.length > 0) {
      const teamCondition = await buildTeamConditions(filters.team)
      if (teamCondition) {
        conditions.push(teamCondition)
      }
    } else if (filters.team !== '') {
      const teamCondition = await buildTeamCondition(filters.team)
      if (teamCondition) {
        conditions.push(teamCondition)
      }
    }
  }

  // Handle PIC filter
  if (filters.pic) {
    if (Array.isArray(filters.pic) && filters.pic.length > 0) {
      const values = filters.pic.map(v => `'${v}'`).join(', ')
      conditions.push(`pic IN (${values})`)
    } else if (filters.pic !== '') {
      conditions.push(`pic = '${filters.pic}'`)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Build WHERE clause for final_sales_monthly (has year/month instead of dates)
  const monthlySummaryConditions: string[] = []

  // Add date range filtering for year/month fields
  if (filters.startDate && filters.endDate) {
    const startDate = new Date(filters.startDate)
    const endDate = new Date(filters.endDate)
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth() + 1 // JS months are 0-indexed
    const endYear = endDate.getFullYear()
    const endMonth = endDate.getMonth() + 1

    // Filter: (year > startYear OR (year = startYear AND month >= startMonth))
    //     AND (year < endYear OR (year = endYear AND month <= endMonth))
    monthlySummaryConditions.push(
      `((year > ${startYear} OR (year = ${startYear} AND month >= ${startMonth})) AND (year < ${endYear} OR (year = ${endYear} AND month <= ${endMonth})))`
    )
  }

  if (filters.team) {
    if (Array.isArray(filters.team) && filters.team.length > 0) {
      const teamCondition = await buildTeamConditions(filters.team)
      if (teamCondition) {
        monthlySummaryConditions.push(teamCondition)
      }
    } else if (filters.team !== '') {
      const teamCondition = await buildTeamCondition(filters.team)
      if (teamCondition) {
        monthlySummaryConditions.push(teamCondition)
      }
    }
  }

  if (filters.pic) {
    if (Array.isArray(filters.pic) && filters.pic.length > 0) {
      const values = filters.pic.map(v => `'${v}'`).join(', ')
      monthlySummaryConditions.push(`pic IN (${values})`)
    } else if (filters.pic !== '') {
      monthlySummaryConditions.push(`pic = '${filters.pic}'`)
    }
  }

  const monthlySummaryWhereClause = monthlySummaryConditions.length > 0 ? `WHERE ${monthlySummaryConditions.join(' AND ')}` : ''

  // Build WHERE clause for Sales-CS breakdown table
  const breakdownConditions: string[] = []

  if (filters.startDate && filters.endDate) {
    breakdownConditions.push(`(start_date <= '${filters.endDate}' AND end_date >= '${filters.startDate}')`)
  }

  if (filters.team) {
    if (Array.isArray(filters.team) && filters.team.length > 0) {
      const teamCondition = await buildTeamConditions(filters.team)
      if (teamCondition) {
        breakdownConditions.push(teamCondition)
      }
    } else if (filters.team !== '') {
      const teamCondition = await buildTeamCondition(filters.team)
      if (teamCondition) {
        breakdownConditions.push(teamCondition)
      }
    }
  }

  if (filters.pic) {
    if (Array.isArray(filters.pic) && filters.pic.length > 0) {
      const values = filters.pic.map(v => `'${v}'`).join(', ')
      breakdownConditions.push(`pic IN (${values})`)
    } else if (filters.pic !== '') {
      breakdownConditions.push(`pic = '${filters.pic}'`)
    }
  }

  if (filters.pid) {
    if (Array.isArray(filters.pid) && filters.pid.length > 0) {
      const values = filters.pid.map(v => `'${v}'`).join(', ')
      breakdownConditions.push(`pid IN (${values})`)
    } else if (filters.pid !== '') {
      breakdownConditions.push(`pid = '${filters.pid}'`)
    }
  }

  if (filters.pubname) {
    if (Array.isArray(filters.pubname) && filters.pubname.length > 0) {
      const values = filters.pubname.map(v => `'${v}'`).join(', ')
      breakdownConditions.push(`pubname IN (${values})`)
    } else if (filters.pubname !== '') {
      breakdownConditions.push(`pubname = '${filters.pubname}'`)
    }
  }

  if (filters.month) {
    if (Array.isArray(filters.month) && filters.month.length > 0) {
      const values = filters.month.map(v => v).join(', ')
      breakdownConditions.push(`month IN (${values})`)
    } else if (filters.month !== '') {
      breakdownConditions.push(`month = ${filters.month}`)
    }
  }

  if (filters.year) {
    if (Array.isArray(filters.year) && filters.year.length > 0) {
      const values = filters.year.map(v => v).join(', ')
      breakdownConditions.push(`year IN (${values})`)
    } else if (filters.year !== '') {
      breakdownConditions.push(`year = ${filters.year}`)
    }
  }

  const breakdownWhereClause = breakdownConditions.length > 0 ? `WHERE ${breakdownConditions.join(' AND ')}` : ''

  return {
    // Query 1: All new sales over time
    allNewSales: `
      SELECT
        pic,
        pid,
        pubname,
        start_date,
        end_date,
        ROUND(CAST(rev_this_month AS FLOAT64), 2) as rev_this_month,
        ROUND(CAST(profit_this_month AS FLOAT64), 2) as profit_this_month,
        ROUND(CAST(rev_last_month AS FLOAT64), 2) as rev_last_month,
        ROUND(CAST(profit_last_month AS FLOAT64), 2) as profit_last_month
      FROM ${newSalesMasterTable}
      ${whereClause}
      ORDER BY start_date DESC
    `,

    // Query 2: New sales summary for time series chart (aggregated by pic and month - will be mapped to team in API)
    summaryTimeSeries: `
      SELECT
        pic,
        year,
        month,
        SUM(total_revenue) as total_revenue,
        SUM(total_profit) as total_profit
      FROM ${finalSalesMonthlyTable}
      ${monthlySummaryWhereClause}
      GROUP BY pic, year, month
      ORDER BY year ASC, month ASC
    `,

    // Query 3: New sales summary pivot tables (Revenue and Profit by pic/month - will be mapped to team in API)
    summaryRevenue: `
      SELECT
        pic,
        year,
        month,
        SUM(total_revenue) as total_revenue
      FROM ${finalSalesMonthlyTable}
      ${monthlySummaryWhereClause}
      GROUP BY pic, year, month
      ORDER BY pic, year, month
    `,

    summaryProfit: `
      SELECT
        pic,
        year,
        month,
        SUM(total_profit) as total_profit
      FROM ${finalSalesMonthlyTable}
      ${monthlySummaryWhereClause}
      GROUP BY pic, year, month
      ORDER BY pic, year, month
    `,

    // Query 4: Sales-CS breakdown (detailed breakdown by publisher and month)
    salesCsBreakdown: `
      SELECT
        pid,
        pubname,
        start_date,
        end_date,
        month,
        year,
        ROUND(CAST(sales_rev AS FLOAT64), 2) as sales_rev,
        ROUND(CAST(sales_profit AS FLOAT64), 2) as sales_profit,
        ROUND(CAST(cs_rev AS FLOAT64), 2) as cs_rev,
        ROUND(CAST(cs_profit AS FLOAT64), 2) as cs_profit
      FROM ${newSalesByPidTable}
      ${breakdownWhereClause}
      ORDER BY year DESC, month DESC, pid
      LIMIT 1000
    `,

    // Query 5: Grand totals for Sales-CS breakdown
    salesCsBreakdownTotals: `
      SELECT
        SUM(sales_rev) as total_sales_rev,
        SUM(sales_profit) as total_sales_profit,
        SUM(cs_rev) as total_cs_rev,
        SUM(cs_profit) as total_cs_profit
      FROM ${newSalesByPidTable}
      ${breakdownWhereClause}
    `,

    // Query 6: Sales-CS breakdown grouped by publisher (expanded view)
    salesCsBreakdownGrouped: `
      SELECT
        pid,
        pubname,
        start_date,
        end_date,
        month,
        year,
        ROUND(CAST(sales_rev AS FLOAT64), 2) as sales_rev,
        ROUND(CAST(sales_profit AS FLOAT64), 2) as sales_profit,
        ROUND(CAST(cs_rev AS FLOAT64), 2) as cs_rev,
        ROUND(CAST(cs_profit AS FLOAT64), 2) as cs_profit
      FROM ${newSalesByPidTable}
      ${breakdownWhereClause}
      ORDER BY pid, year DESC, month DESC
      LIMIT 1000
    `
  }
}

/**
 * Build team breakdown query with server-side aggregation
 * Returns pre-aggregated team×date data using UNION ALL approach
 *
 * @param whereClause - WHERE clause built from buildWhereClause()
 * @returns SQL query string that aggregates by team+date
 */
export async function buildTeamBreakdownQuery(whereClause: string): Promise<string> {
  const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'

  // Fetch team configurations from Supabase (cached 5 min)
  const { picMappings, teams } = await getTeamConfigurations()

  console.log('[buildTeamBreakdownQuery] Building query for', teams.length, 'teams')

  // Build separate SELECT for each team
  const teamCases: string[] = []

  // Process each configured team
  teams.forEach(team => {
    const teamPics = picMappings
      .filter(m => m.team_id === team.team_id)
      .map(m => m.pic_name)

    if (teamPics.length > 0) {
      // SQL escape: replace ' with ''
      const escapedTeamId = team.team_id.replace(/'/g, "''")
      const escapedTeamName = (team.team_name || team.team_id).replace(/'/g, "''")
      const picList = teamPics
        .map(pic => `'${pic.replace(/'/g, "''")}'`)
        .join(', ')

      teamCases.push(`
    -- Team: ${escapedTeamName}
    SELECT
      DATE as date,
      '${escapedTeamId}' as team_id,
      '${escapedTeamName}' as team_name,
      SUM(rev) as revenue,
      SUM(profit) as profit,
      SUM(req) as requests,
      SUM(paid) as paid
    FROM ${tableName}
    ${whereClause ? `${whereClause} AND` : 'WHERE'} pic IN (${picList})
    GROUP BY DATE`.trim())
    }
  })

  // Add "Unassigned" query for PICs not mapped to any team
  const allAssignedPics = picMappings.map(m => m.pic_name)

  if (allAssignedPics.length > 0) {
    const assignedPicList = allAssignedPics
      .map(pic => `'${pic.replace(/'/g, "''")}'`)
      .join(', ')

    teamCases.push(`
    -- Unassigned (PICs not in any team mapping)
    SELECT
      DATE as date,
      'unassigned' as team_id,
      'Unassigned' as team_name,
      SUM(rev) as revenue,
      SUM(profit) as profit,
      SUM(req) as requests,
      SUM(paid) as paid
    FROM ${tableName}
    ${whereClause ? `${whereClause} AND` : 'WHERE'} (pic NOT IN (${assignedPicList}) OR pic IS NULL OR TRIM(pic) = '')
    GROUP BY DATE`.trim())
  } else {
    // No teams configured - everything is unassigned
    teamCases.push(`
    -- All Unassigned (no team configurations exist)
    SELECT
      DATE as date,
      'unassigned' as team_id,
      'Unassigned' as team_name,
      SUM(rev) as revenue,
      SUM(profit) as profit,
      SUM(req) as requests,
      SUM(paid) as paid
    FROM ${tableName}
    ${whereClause}
    GROUP BY DATE`.trim())
  }

  // Combine all team queries with UNION ALL
  const finalQuery = teamCases.join('\n\nUNION ALL\n\n') +
    '\n\nORDER BY date ASC, team_name ASC'

  console.log('[buildTeamBreakdownQuery] Generated SQL with', teamCases.length, 'team cases')

  return finalQuery
}

/**
 * Build PIC breakdown query for a specific team with server-side aggregation
 * Returns pre-aggregated PIC×date data for PICs in the specified team
 *
 * @param team_id - Team ID to filter PICs
 * @param whereClause - WHERE clause built from buildWhereClause()
 * @returns SQL query string that aggregates by PIC+date for the team
 */
export async function buildPICBreakdownQuery(team_id: string, whereClause: string): Promise<string> {
  const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'

  // Fetch team configurations from Supabase (cached 5 min)
  const { picMappings } = await getTeamConfigurations()

  console.log('[buildPICBreakdownQuery] Building query for team:', team_id)

  // Get PICs for the specified team
  const teamPics = picMappings
    .filter(m => m.team_id === team_id)
    .map(m => m.pic_name)

  if (teamPics.length === 0) {
    console.warn('[buildPICBreakdownQuery] No PICs found for team:', team_id)
    // Return empty result query
    return `
      SELECT
        DATE as date,
        '' as pic_name,
        0 as revenue,
        0 as profit,
        0 as requests,
        0 as paid
      FROM ${tableName}
      WHERE FALSE
    `.trim()
  }

  // SQL escape PICs
  const picList = teamPics
    .map(pic => `'${pic.replace(/'/g, "''")}'`)
    .join(', ')

  // Build query aggregating by PIC and DATE
  const query = `
    SELECT
      DATE as date,
      pic as pic_name,
      SUM(rev) as revenue,
      SUM(profit) as profit,
      SUM(req) as requests,
      SUM(paid) as paid
    FROM ${tableName}
    ${whereClause ? `${whereClause} AND` : 'WHERE'} pic IN (${picList})
    GROUP BY DATE, pic
    ORDER BY DATE ASC, pic ASC
  `.trim()

  console.log('[buildPICBreakdownQuery] Generated query for', teamPics.length, 'PICs')

  return query
}
