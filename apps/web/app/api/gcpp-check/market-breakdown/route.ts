import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildGCPPWhereClause, getMarketBreakdownQueries } from '../../../../lib/services/gcppQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()

    // Build WHERE clause
    // Exclude 'category' since it's computed in the CTE and filtered in outer query
    const filtersForWhere = { ...filters }
    delete filtersForWhere.category

    const whereClause = buildGCPPWhereClause(filtersForWhere)

    // Get queries with filters for category filtering (pass original filters with category)
    const queries = getMarketBreakdownQueries(whereClause, filters)

    // Execute queries in parallel
    const [
      top100ByMarket,
      pubCountByPartnerMarket,
      pubCountBreakdown
    ] = await Promise.all([
      BigQueryService.executeQuery(queries.top100ByMarket),
      BigQueryService.executeQuery(queries.pubCountByPartnerMarket),
      BigQueryService.executeQuery(queries.pubCountBreakdown)
    ])

    return NextResponse.json({
      status: 'ok',
      data: {
        top100ByMarket,
        pubCountByPartnerMarket,
        pubCountBreakdown
      }
    })
  } catch (error: any) {
    console.error('Error fetching Market Breakdown data:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
