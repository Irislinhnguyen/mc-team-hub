import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildGCPPWhereClause, getMarketOverviewQueries } from '../../../../lib/services/gcppQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()

    console.log('[Market Overview API] 📥 Received filters:', filters)

    // Build WHERE clause from filters
    const whereClause = buildGCPPWhereClause(filters)
    console.log('[Market Overview API] 🔧 Generated WHERE clause:', whereClause)

    // Build special WHERE clause for marketDistribution without market filter
    // This allows pie chart to show all markets with visual highlighting
    const whereClauseNoMarket = buildGCPPWhereClause(filters, undefined, ['market'])

    // Get queries for Market Overview - use special WHERE for marketDistribution
    const queries = getMarketOverviewQueries(whereClause)
    const marketDistributionQuery = getMarketOverviewQueries(whereClauseNoMarket).marketDistribution

    // Debug: Log the queries to see what's being generated
    console.log('[Market Overview API] marketDistribution query (no market filter):', marketDistributionQuery)

    // Execute all queries in parallel
    const [
      marketShareByMarketPartner,
      marketShareDetail,
      impressionsTimeSeries,
      marketDistribution
    ] = await Promise.all([
      BigQueryService.executeQuery(queries.marketShareByMarketPartner),
      BigQueryService.executeQuery(queries.marketShareDetail),
      BigQueryService.executeQuery(queries.impressionsTimeSeries),
      BigQueryService.executeQuery(marketDistributionQuery)
    ])

    // Debug: Log marketDistribution data for each partner
    console.log('[Market Overview API] marketDistribution data:', JSON.stringify(marketDistribution, null, 2))

    return NextResponse.json({
      status: 'ok',
      data: {
        marketShareByMarketPartner,
        marketShareDetail,
        impressionsTimeSeries,
        marketDistribution
      }
    })
  } catch (error: any) {
    console.error('Error fetching Market Overview data:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
