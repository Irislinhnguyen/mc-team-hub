import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../lib/services/bigquery'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()

    // Build BigQuery query based on action type and config
    const query = buildQuery(config)

    if (!query) {
      return NextResponse.json(
        { status: 'error', message: 'Unable to build query from configuration' },
        { status: 400 }
      )
    }

    // Execute the query
    const rows = await BigQueryService.executeQuery(query)

    // Return results
    return NextResponse.json({
      status: 'ok',
      data: rows,
      count: rows.length,
      metadata: {
        queryTime: new Date().toISOString(),
        action: config.action,
      },
    })
  } catch (error) {
    console.error('Error analyzing data:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

function buildQuery(config: Record<string, any>): string | null {
  const tableName = 'gcpp-check.GI_publisher.agg_monthly_with_pic_table'
  const action = config.action

  switch (action) {
    case 'check':
      return buildCheckQuery(config, tableName)
    case 'compare':
      return buildCompareQuery(config, tableName)
    case 'rank':
      return buildRankQuery(config, tableName)
    case 'suggest':
      return buildSuggestQuery(config, tableName)
    case 'personal':
      return buildPersonalQuery(config, tableName)
    default:
      return null
  }
}

function buildCheckQuery(config: Record<string, any>, tableName: string): string {
  const metric = mapMetricToColumn(config.metric)
  const entityColumn = mapEntityToColumn(config.entityType)
  const timeframe = config.timeframe

  // Build date filters
  const dateFilter = buildDateFilter(timeframe, config.startDate, config.endDate)

  // Build other filters
  const otherFilters = buildOtherFilters(config)

  return `
    SELECT
      ${entityColumn} as entity,
      ${metric} as metric_value,
      DATE as date
    FROM \`${tableName}\`
    WHERE ${dateFilter}
    ${otherFilters ? `AND ${otherFilters}` : ''}
    ORDER BY metric_value DESC
    LIMIT 1000
  `
}

function buildCompareQuery(config: Record<string, any>, tableName: string): string {
  const timeframe = config.timeframe
  const comparisonPeriod = config.comparison || 'previous_period'
  const metrics = config.metrics || ['rev']

  // Get primary period dates
  let startDate1 = new Date()
  let endDate1 = new Date()

  if (timeframe === 'custom') {
    startDate1 = new Date(config.startDate)
    endDate1 = new Date(config.endDate)
  } else {
    const period = getPeriodDates(timeframe)
    startDate1 = period.start
    endDate1 = period.end
  }

  // Calculate comparison period dates based on comparison type
  let startDate2 = new Date(startDate1)
  let endDate2 = new Date(endDate1)
  const periodDays = Math.ceil((endDate1.getTime() - startDate1.getTime()) / (1000 * 60 * 60 * 24))

  switch (comparisonPeriod) {
    case 'previous_period':
      startDate2.setDate(startDate1.getDate() - periodDays)
      endDate2.setDate(endDate1.getDate() - periodDays)
      break
    case 'previous_timeframe':
      startDate2.setDate(startDate1.getDate() - 1)
      endDate2.setDate(endDate1.getDate() - 1)
      break
    case 'yoy':
      startDate2.setFullYear(startDate1.getFullYear() - 1)
      endDate2.setFullYear(endDate1.getFullYear() - 1)
      break
    // For averages, we'll calculate in the results
  }

  const metricCols = metrics.map(m => mapMetricToColumn(m)).join(', ')
  const start1 = startDate1.toISOString().split('T')[0]
  const end1 = endDate1.toISOString().split('T')[0]
  const start2 = startDate2.toISOString().split('T')[0]
  const end2 = endDate2.toISOString().split('T')[0]

  return `
    SELECT
      DATE as date,
      'Period 1' as period,
      ${metricCols}
    FROM \`${tableName}\`
    WHERE DATE >= '${start1}' AND DATE <= '${end1}'
    UNION ALL
    SELECT
      DATE as date,
      'Period 2' as period,
      ${metricCols}
    FROM \`${tableName}\`
    WHERE DATE >= '${start2}' AND DATE <= '${end2}'
    ORDER BY DATE DESC
    LIMIT 2000
  `
}

function getPeriodDates(timeframe: string): { start: Date; end: Date } {
  const today = new Date()
  let start = new Date()
  let end = new Date()

  switch (timeframe) {
    case 'yesterday':
      start.setDate(today.getDate() - 1)
      end = new Date(start)
      break
    case 'this_week':
      start = new Date(today)
      start.setDate(today.getDate() - today.getDay())
      end = today
      break
    case 'this_month':
      // Use local date values to avoid timezone shift
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = today
      break
    case 'last_7days':
      start.setDate(today.getDate() - 7)
      end = today
      break
    case 'last_30days':
      start.setDate(today.getDate() - 30)
      end = today
      break
    default:
      start.setDate(today.getDate() - 1)
      end = new Date(start)
  }

  return { start, end }
}

function buildRankQuery(config: Record<string, any>, tableName: string): string {
  const metric = mapMetricToColumn(config.rankMetric)
  const entityColumn = mapEntityToColumn(config.entityType)
  const timeframe = config.timeframe
  const ranking = config.rankingType
  const limit = config.rankLimit || 10

  const dateFilter = buildDateFilter(timeframe, config.startDate, config.endDate)

  return `
    SELECT
      ${entityColumn} as entity,
      ${metric} as metric_value
    FROM \`${tableName}\`
    WHERE ${dateFilter}
    GROUP BY entity
    ORDER BY metric_value ${ranking === 'top' ? 'DESC' : 'ASC'}
    LIMIT ${limit}
  `
}

function buildSuggestQuery(config: Record<string, any>, tableName: string): string {
  const timeframe = config.timeframe
  const dateFilter = buildDateFilter(timeframe, config.startDate, config.endDate)

  return `
    SELECT
      *
    FROM \`${tableName}\`
    WHERE ${dateFilter}
    LIMIT 100
  `
}

function buildPersonalQuery(config: Record<string, any>, tableName: string): string {
  const metric = mapMetricToColumn(config.metric)
  const timeframe = config.timeframe
  const dateFilter = buildDateFilter(timeframe, config.startDate, config.endDate)

  return `
    SELECT
      DATE as date,
      ${metric} as metric_value
    FROM \`${tableName}\`
    WHERE ${dateFilter}
    ORDER BY DATE DESC
    LIMIT 1000
  `
}

function mapMetricToColumn(metric: string): string {
  const mapping: Record<string, string> = {
    revenue: 'rev',
    profit: 'profit',
    count: 'COUNT(*)',
    ad_request: 'req',
    ecpm: 'ecpm',
    fill_rate: 'fill_rate',
    prediction: 'prediction',
  }
  return mapping[metric] || 'rev'
}

function mapEntityToColumn(entityType: string): string {
  const mapping: Record<string, string> = {
    publisher: 'pubname',
    zone: 'zid',
    format: 'product',
    team: 'pic',
  }
  return mapping[entityType] || 'pubname'
}

function buildDateFilter(timeframe: string, startDate?: string | Date, endDate?: string | Date): string {
  const today = new Date()
  let startDate_new = new Date()
  let endDate_new = new Date()

  switch (timeframe) {
    case 'yesterday':
      startDate_new = new Date(today)
      startDate_new.setDate(today.getDate() - 1)
      endDate_new = new Date(startDate_new)
      break
    case 'this_week': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      startDate_new = weekStart
      endDate_new = today
      break
    }
    case 'this_month':
      // Use local date values to avoid timezone shift
      startDate_new = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate_new = today
      break
    case 'last_7days':
      startDate_new = new Date(today)
      startDate_new.setDate(today.getDate() - 7)
      endDate_new = today
      break
    case 'last_30days':
      startDate_new = new Date(today)
      startDate_new.setDate(today.getDate() - 30)
      endDate_new = today
      break
    case 'custom':
      if (startDate && endDate) {
        startDate_new = new Date(startDate)
        endDate_new = new Date(endDate)
      }
      break
  }

  // Use timezone-safe date formatting to avoid date shift issues
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const startStr = formatDateToYYYYMMDD(startDate_new)
  const endStr = formatDateToYYYYMMDD(endDate_new)

  return `DATE >= '${startStr}' AND DATE <= '${endStr}'`
}

function buildOtherFilters(config: Record<string, any>): string {
  const filters: string[] = []

  // Filter by selected entities
  if (config.selectedEntities && config.selectedEntities.length > 0) {
    const entityColumn = mapEntityToColumn(config.entityType)
    const entityList = config.selectedEntities
      .map((e: string) => `'${e}'`)
      .join(',')
    filters.push(`${entityColumn} IN (${entityList})`)
  }

  // Filter by ad format
  if (config.filters?.adFormat && config.filters.adFormat.length > 0) {
    const formatList = config.filters.adFormat
      .map((f: string) => `'${f}'`)
      .join(',')
    filters.push(`product IN (${formatList})`)
  }

  // Filter by team
  if (config.filters?.team && config.filters.team.length > 0) {
    const teamList = config.filters.team
      .map((t: string) => `'${t}'`)
      .join(',')
    filters.push(`pic IN (${teamList})`)
  }

  return filters.join(' AND ')
}
