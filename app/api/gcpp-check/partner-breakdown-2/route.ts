import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildGCPPWhereClause, getPartnerBreakdown2Queries } from '../../../../lib/services/gcppQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()

    // Exclude 'category' from WHERE clause (it's a computed field in other queries)
    const filtersForWhere = { ...filters }
    delete filtersForWhere.category

    const whereClause = buildGCPPWhereClause(filtersForWhere)
    const queries = getPartnerBreakdown2Queries(whereClause)

    const [
      top100ByPartner,
      topPubsByPartnerMarket,
      genieeWallet
    ] = await Promise.all([
      BigQueryService.executeQuery(queries.top100ByPartner),
      BigQueryService.executeQuery(queries.topPubsByPartnerMarket),
      BigQueryService.executeQuery(queries.genieeWallet)
    ])

    return NextResponse.json({
      status: 'ok',
      data: {
        top100ByPartner,
        topPubsByPartnerMarket,
        genieeWallet
      }
    })
  } catch (error: any) {
    console.error('Error fetching Partner Breakdown 2 data:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
