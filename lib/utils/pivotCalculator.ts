/**
 * Pivot Table Calculator
 *
 * Client-side pivot table calculation from raw query results
 */

import type { PivotConfig, PivotTableData, PivotRow, AggregationFunction } from '../types/queryLab'

/**
 * Calculate pivot table from raw data
 */
export function calculatePivotTable(
  data: Array<Record<string, any>>,
  config: PivotConfig
): PivotTableData {
  const { rows, columns, values } = config

  // If no configuration, return empty structure
  if (rows.length === 0 && columns.length === 0 && values.length === 0) {
    return {
      headers: [],
      rows: [],
      totals: {}
    }
  }

  // Simple case: No columns dimension (just rows + values)
  if (columns.length === 0) {
    return calculateFlatTable(data, rows, values)
  }

  // Full pivot: rows × columns with values
  return calculateFullPivot(data, rows, columns, values)
}

/**
 * Calculate flat table (rows + values, no column pivoting)
 */
function calculateFlatTable(
  data: Array<Record<string, any>>,
  rowFields: string[],
  valueConfigs: Array<{ field: string; aggregation: AggregationFunction; label?: string }>
): PivotTableData {
  // Group by row fields
  const grouped = groupByFields(data, rowFields)

  // Build rows
  const rows: PivotRow[] = []

  for (const [groupKey, groupData] of Object.entries(grouped)) {
    const rowValues: Record<string, number | string> = {}

    // Calculate aggregations for each value config
    valueConfigs.forEach(valueConfig => {
      const aggValue = aggregate(groupData, valueConfig.field, valueConfig.aggregation)
      const label = valueConfig.label || `${valueConfig.field} (${valueConfig.aggregation})`
      rowValues[label] = aggValue
    })

    rows.push({
      key: groupKey,
      label: groupKey,
      values: rowValues
    })
  }

  // Sort by first value descending
  if (valueConfigs.length > 0) {
    const firstValueLabel = valueConfigs[0].label || `${valueConfigs[0].field} (${valueConfigs[0].aggregation})`
    rows.sort((a, b) => {
      const aVal = typeof a.values[firstValueLabel] === 'number' ? a.values[firstValueLabel] : 0
      const bVal = typeof b.values[firstValueLabel] === 'number' ? b.values[firstValueLabel] : 0
      return (bVal as number) - (aVal as number)
    })
  }

  // Build headers
  const headers = valueConfigs.map(vc => vc.label || `${vc.field} (${vc.aggregation})`)

  // Calculate totals
  const totals: Record<string, number> = {}
  valueConfigs.forEach(valueConfig => {
    const label = valueConfig.label || `${valueConfig.field} (${valueConfig.aggregation})`
    totals[label] = aggregate(data, valueConfig.field, valueConfig.aggregation)
  })

  return {
    headers,
    rows,
    totals
  }
}

/**
 * Calculate full pivot table (rows × columns)
 */
function calculateFullPivot(
  data: Array<Record<string, any>>,
  rowFields: string[],
  columnFields: string[],
  valueConfigs: Array<{ field: string; aggregation: AggregationFunction; label?: string }>
): PivotTableData {
  // Get unique column values
  const columnValues = getUniqueValues(data, columnFields)

  // Group by row fields
  const rowGroups = groupByFields(data, rowFields)

  // Build rows
  const rows: PivotRow[] = []

  for (const [rowKey, rowData] of Object.entries(rowGroups)) {
    const rowValues: Record<string, number | string> = {}

    // For each column value, calculate aggregations
    columnValues.forEach(colValue => {
      // Filter data for this row + column combination
      const cellData = rowData.filter(item => {
        return columnFields.every((field, idx) => {
          const colParts = colValue.split(' | ')
          return String(item[field]) === colParts[idx]
        })
      })

      // Calculate each value metric
      valueConfigs.forEach(valueConfig => {
        const aggValue = cellData.length > 0
          ? aggregate(cellData, valueConfig.field, valueConfig.aggregation)
          : 0

        const valueLabel = valueConfig.label || valueConfig.field
        const cellKey = `${colValue} - ${valueLabel}`
        rowValues[cellKey] = aggValue
      })
    })

    // Calculate row totals
    valueConfigs.forEach(valueConfig => {
      const valueLabel = valueConfig.label || valueConfig.field
      const totalKey = `Total - ${valueLabel}`
      rowValues[totalKey] = aggregate(rowData, valueConfig.field, valueConfig.aggregation)
    })

    rows.push({
      key: rowKey,
      label: rowKey,
      values: rowValues
    })
  }

  // Sort by total of first value metric
  if (valueConfigs.length > 0) {
    const firstValueLabel = valueConfigs[0].label || valueConfigs[0].field
    const totalKey = `Total - ${firstValueLabel}`
    rows.sort((a, b) => {
      const aVal = typeof a.values[totalKey] === 'number' ? a.values[totalKey] : 0
      const bVal = typeof b.values[totalKey] === 'number' ? b.values[totalKey] : 0
      return (bVal as number) - (aVal as number)
    })
  }

  // Build headers
  const headers: string[] = []
  columnValues.forEach(colValue => {
    valueConfigs.forEach(valueConfig => {
      const valueLabel = valueConfig.label || valueConfig.field
      headers.push(`${colValue} - ${valueLabel}`)
    })
  })
  // Add total columns
  valueConfigs.forEach(valueConfig => {
    const valueLabel = valueConfig.label || valueConfig.field
    headers.push(`Total - ${valueLabel}`)
  })

  // Calculate grand totals
  const totals: Record<string, number> = {}
  columnValues.forEach(colValue => {
    const colData = data.filter(item => {
      return columnFields.every((field, idx) => {
        const colParts = colValue.split(' | ')
        return String(item[field]) === colParts[idx]
      })
    })

    valueConfigs.forEach(valueConfig => {
      const valueLabel = valueConfig.label || valueConfig.field
      const cellKey = `${colValue} - ${valueLabel}`
      totals[cellKey] = aggregate(colData, valueConfig.field, valueConfig.aggregation)
    })
  })
  // Grand totals
  valueConfigs.forEach(valueConfig => {
    const valueLabel = valueConfig.label || valueConfig.field
    const totalKey = `Total - ${valueLabel}`
    totals[totalKey] = aggregate(data, valueConfig.field, valueConfig.aggregation)
  })

  return {
    headers,
    rows,
    totals
  }
}

/**
 * Group data by fields
 */
function groupByFields(
  data: Array<Record<string, any>>,
  fields: string[]
): Record<string, Array<Record<string, any>>> {
  const grouped: Record<string, Array<Record<string, any>>> = {}

  data.forEach(item => {
    const key = fields.map(field => String(item[field] || '')).join(' | ')
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(item)
  })

  return grouped
}

/**
 * Get unique values for column fields
 */
function getUniqueValues(data: Array<Record<string, any>>, fields: string[]): string[] {
  const uniqueSet = new Set<string>()

  data.forEach(item => {
    const value = fields.map(field => String(item[field] || '')).join(' | ')
    uniqueSet.add(value)
  })

  return Array.from(uniqueSet).sort()
}

/**
 * Aggregate values
 */
function aggregate(
  data: Array<Record<string, any>>,
  field: string,
  aggregation: AggregationFunction
): number {
  if (data.length === 0) return 0

  const values = data.map(item => {
    const val = item[field]
    return typeof val === 'number' ? val : parseFloat(val) || 0
  })

  switch (aggregation) {
    case 'SUM':
      return values.reduce((sum, val) => sum + val, 0)

    case 'AVG': {
      const sum = values.reduce((sum, val) => sum + val, 0)
      return values.length > 0 ? sum / values.length : 0
    }

    case 'COUNT':
      return data.length

    case 'MIN':
      return Math.min(...values)

    case 'MAX':
      return Math.max(...values)

    default:
      return 0
  }
}

/**
 * Format number for display
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  if (typeof value === 'string') return value

  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toFixed(decimals)
}
