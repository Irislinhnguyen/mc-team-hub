import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildWhereClause, getDailyOpsQueries, getDailyOpsMetricsQuery } from '../../../../lib/services/analyticsQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()

    // Build WHERE clause using centralized function
    // For metrics query: include date filter (main table has DATE column), skip rev_flag (column doesn't exist)
    // For tables query: skip date filter (top_movers_daily doesn't have DATE column), include rev_flag
    const whereClauseWithDate = await buildWhereClause(filters, { skipRevFlagFilter: true })
    const whereClauseNoDate = await buildWhereClause(filters, { skipDateFilter: true })

    console.log('[Daily Ops] WHERE clause (with date):', whereClauseWithDate)
    console.log('[Daily Ops] WHERE clause (no date):', whereClauseNoDate)

    // Get queries for metrics (from main table) and tables (from top_movers_daily)
    const metricsQuery = getDailyOpsMetricsQuery(whereClauseWithDate)
    const tableQueries = getDailyOpsQueries(whereClauseNoDate)

    const [metricsResult, topMovers, details] = await Promise.all([
      BigQueryService.executeQuery(metricsQuery),
      BigQueryService.executeQuery(tableQueries.topMovers),
      BigQueryService.executeQuery(tableQueries.topMoversDetails),
    ])

    const metrics = metricsResult[0] || {}

    console.log('[Daily Ops] Metrics:', metrics)
    console.log('[Daily Ops] Top Movers count:', topMovers.length)
    console.log('[Daily Ops] Details count:', details.length)

    return NextResponse.json({
      status: 'ok',
      data: {
        metrics,
        topMovers,
        topMoversDetails: details,
      },
    })
  } catch (error) {
    console.error('Error fetching daily ops data:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
