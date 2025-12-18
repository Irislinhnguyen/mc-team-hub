/**
 * Deep Dive Query Builder
 *
 * Shared SQL generation logic for all deep-dive perspectives
 * Consolidates tier classification, revenue ranking, and metric calculations
 */

import { PerspectiveConfig } from '../config/perspectiveConfigs'
import { FIELD_DATA_TYPES, type FilterField } from '../types/performanceTracker'

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
 * Determine the correct data type for a field and coerce the value accordingly
 * Uses FIELD_DATA_TYPES mapping to ensure type correctness for BigQuery
 */
function getFieldDataTypeAndCoerceValue(
  fieldName: string,
  value: any
): { dataType: 'string' | 'number'; coercedValue: any } {
  // Look up the field type from FIELD_DATA_TYPES
  const fieldType = FIELD_DATA_TYPES[fieldName as FilterField]

  // If field is not in mapping, throw a clear error
  if (!fieldType) {
    throw new Error(
      `Unknown field type for '${fieldName}'. ` +
      `Please add it to FIELD_DATA_TYPES in lib/types/performanceTracker.ts`
    )
  }

  // Coerce value to the correct type
  if (fieldType === 'number') {
    const num = Number(value)
    if (isNaN(num)) {
      throw new Error(
        `Field '${fieldName}' expects a number but received invalid value: ${value}`
      )
    }
    return { dataType: 'number', coercedValue: num }
  }

  // For string and date types, convert to string
  return { dataType: 'string', coercedValue: String(value) }
}

export interface Period {
  start: string
  end: string
}

export interface QueryParams {
  period1: Period
  period2: Period
  parentId?: string | number
  additionalCondition?: string
  filters?: Record<string, any>
  tierFilter?: string
}

/**
 * Build the metrics CTE - aggregates base metrics for two periods
 */
export function buildMetricsCTE(
  config: PerspectiveConfig,
  params: QueryParams
): string {
  const { groupBy, nameField, additionalFields = [] } = config
  const { period1, period2, parentId, additionalCondition } = params

  // Parent filter (for drill-down) - properly escaped to prevent SQL injection
  let parentFilter = ''
  if (parentId !== undefined && parentId !== null) {
    const { dataType, coercedValue } = getFieldDataTypeAndCoerceValue(
      config.idField,
      parentId
    )
    const escapedValue = escapeSqlValue(coercedValue, dataType)
    parentFilter = `AND ${config.idField} = ${escapedValue}`
  }

  // Build additional fields string with proper comma handling
  const additionalFieldsStr = additionalFields.length > 0
    ? ',\n        ' + additionalFields.join(',\n        ')
    : ''

  console.log('[buildMetricsCTE] NEW VERSION - Using CAST for request_CPM')

  return `
    entity_metrics AS (
      SELECT
        ${groupBy},
        ${nameField}${additionalFieldsStr},

        -- Period 1 metrics
        SUM(CASE WHEN DATE >= '${period1.start}' AND DATE <= '${period1.end}' THEN req ELSE 0 END) as req_p1,
        SUM(CASE WHEN DATE >= '${period1.start}' AND DATE <= '${period1.end}' THEN rev ELSE 0 END) as rev_p1,
        SUM(CASE WHEN DATE >= '${period1.start}' AND DATE <= '${period1.end}' THEN paid ELSE 0 END) as paid_p1,
        AVG(CASE WHEN DATE >= '${period1.start}' AND DATE <= '${period1.end}' THEN CAST(request_CPM as FLOAT64) ELSE NULL END) as ecpm_p1,

        -- Period 2 metrics
        SUM(CASE WHEN DATE >= '${period2.start}' AND DATE <= '${period2.end}' THEN req ELSE 0 END) as req_p2,
        SUM(CASE WHEN DATE >= '${period2.start}' AND DATE <= '${period2.end}' THEN rev ELSE 0 END) as rev_p2,
        SUM(CASE WHEN DATE >= '${period2.start}' AND DATE <= '${period2.end}' THEN paid ELSE 0 END) as paid_p2,
        AVG(CASE WHEN DATE >= '${period2.start}' AND DATE <= '${period2.end}' THEN CAST(request_CPM as FLOAT64) ELSE NULL END) as ecpm_p2

      FROM ${config.tableName}
      WHERE 1=1
        ${parentFilter}
        ${additionalCondition ? `AND ${additionalCondition}` : ''}
      GROUP BY ${groupBy}
    )
  `
}

/**
 * Build the calculations CTE - derives fill rates and change percentages
 */
export function buildCalculationsCTE(): string {
  return `
    entity_calculations AS (
      SELECT
        *,
        -- Fill rates
        SAFE_DIVIDE(paid_p1, req_p1) * 100 as fill_rate_p1,
        SAFE_DIVIDE(paid_p2, req_p2) * 100 as fill_rate_p2,

        -- Change percentages
        SAFE_DIVIDE(req_p2 - req_p1, NULLIF(req_p1, 0)) * 100 as req_change_pct,
        SAFE_DIVIDE(rev_p2 - rev_p1, NULLIF(rev_p1, 0)) * 100 as rev_change_pct,
        SAFE_DIVIDE(ecpm_p2 - ecpm_p1, NULLIF(ecpm_p1, 0)) * 100 as ecpm_change_pct,
        SAFE_DIVIDE(
          (SAFE_DIVIDE(paid_p2, req_p2) - SAFE_DIVIDE(paid_p1, req_p1)),
          NULLIF(SAFE_DIVIDE(paid_p1, req_p1), 0)
        ) * 100 as fill_rate_change_pct

      FROM entity_metrics
    )
  `
}

/**
 * Build the revenue ranking CTE - calculates cumulative revenue
 * This is SHARED across all perspectives
 */
export function buildRevenueRankingCTE(): string {
  return `
    revenue_ranked AS (
      SELECT
        *,
        SUM(rev_p2) OVER () as total_revenue,
        SUM(rev_p2) OVER (
          ORDER BY rev_p2 DESC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) as cumulative_revenue
      FROM entity_calculations
    )
  `
}

/**
 * Build the revenue tiering CTE - applies Pareto classification (A/B/C)
 * This is SHARED across all perspectives
 */
export function buildRevenueTieringCTE(): string {
  return `
    revenue_tiered AS (
      SELECT
        *,
        (cumulative_revenue / NULLIF(total_revenue, 0)) * 100 as cumulative_revenue_pct,
        CASE
          WHEN (cumulative_revenue / NULLIF(total_revenue, 0)) * 100 <= 80 THEN 'A'
          WHEN (cumulative_revenue / NULLIF(total_revenue, 0)) * 100 <= 95 THEN 'B'
          ELSE 'C'
        END as revenue_tier
      FROM revenue_ranked
    )
  `
}

/**
 * Build the tier classification CTE - Simple A/B/C tier logic
 * This is SHARED across all perspectives
 */
export function buildTierClassificationCTE(): string {
  return `
    entity_with_tier AS (
      SELECT
        *,
        -- Status (new/lost/existing)
        CASE
          WHEN rev_p1 = 0 AND rev_p2 > 0 THEN 'new'
          WHEN rev_p1 > 0 AND rev_p2 = 0 THEN 'lost'
          ELSE 'existing'
        END as status,

        -- Simple tier classification (A/B/C)
        -- For all items (new/lost/existing): use actual revenue_tier (A/B/C)
        revenue_tier as tier

      FROM revenue_tiered
    )
  `
}

/**
 * Build CTE for calculating 6-month monthly average revenue for lost items
 * This is used to show "average monthly revenue" as lost impact
 */
export function buildMonthlyAverageCTE(
  config: PerspectiveConfig,
  params: QueryParams
): string {
  const { groupBy } = config
  const { period1, parentId, additionalCondition } = params

  // Parent filter (for drill-down) - properly escaped to prevent SQL injection
  let parentFilter = ''
  if (parentId !== undefined && parentId !== null) {
    const { dataType, coercedValue } = getFieldDataTypeAndCoerceValue(
      config.idField,
      parentId
    )
    const escapedValue = escapeSqlValue(coercedValue, dataType)
    parentFilter = `AND ${config.idField} = ${escapedValue}`
  }

  return `
    monthly_revenue AS (
      SELECT
        ${groupBy},
        year,
        month,
        SUM(rev) as monthly_rev
      FROM ${config.tableName}
      WHERE DATE <= '${period1.end}'
        AND DATE >= DATE_SUB('${period1.end}', INTERVAL 6 MONTH)
        ${parentFilter}
        ${additionalCondition ? `AND ${additionalCondition}` : ''}
      GROUP BY ${groupBy}, year, month
    ),

    monthly_avg AS (
      SELECT
        ${groupBy},
        AVG(monthly_rev) as avg_monthly_revenue,
        COUNT(*) as months_with_data
      FROM monthly_revenue
      GROUP BY ${groupBy}
    )
  `
}

/**
 * Build complete deep-dive query for a perspective
 */
export function buildDeepDiveQuery(
  config: PerspectiveConfig,
  params: QueryParams,
  tierFilter?: string
): string {
  const metricsCTE = buildMetricsCTE(config, params)
  const calculationsCTE = buildCalculationsCTE()
  const revenueRankingCTE = buildRevenueRankingCTE()
  const revenueTieringCTE = buildRevenueTieringCTE()
  const tierClassificationCTE = buildTierClassificationCTE()
  const monthlyAverageCTE = buildMonthlyAverageCTE(config, params)

  // Tier filter for drill-down
  const tierCondition = tierFilter ? `WHERE tier = '${tierFilter}'` : ''

  // Remove trailing comma from monthlyAverageCTE since it's the last CTE
  const monthlyAvgCTECleaned = monthlyAverageCTE.trim()

  return `
    WITH
    ${metricsCTE},
    ${calculationsCTE},
    ${revenueRankingCTE},
    ${revenueTieringCTE},
    ${tierClassificationCTE},
    ${monthlyAvgCTECleaned}

    SELECT
      ewt.*,
      ma.avg_monthly_revenue,
      ma.months_with_data
    FROM entity_with_tier ewt
    LEFT JOIN monthly_avg ma USING (${config.groupBy})
    ${tierCondition}
    ORDER BY ewt.rev_p2 DESC
  `
}

/**
 * Calculate historical period (same time last year)
 */
export function getHistoricalPeriod(period: Period): Period {
  const start = new Date(period.start)
  const end = new Date(period.end)
  start.setFullYear(start.getFullYear() - 1)
  end.setFullYear(end.getFullYear() - 1)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}
