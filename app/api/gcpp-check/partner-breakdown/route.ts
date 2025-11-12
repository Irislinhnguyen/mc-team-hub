import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildGCPPWhereClause, getPartnerBreakdownQueries } from '../../../../lib/services/gcppQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()
    console.log('[DEBUG] Partner Breakdown API - Filters received:', JSON.stringify(filters, null, 2))

    // Build WHERE clause
    // Exclude 'category' since it's computed in the CTE and filtered in outer query
    const filtersForWhere = { ...filters }
    delete filtersForWhere.category

    const whereClause = buildGCPPWhereClause(filtersForWhere)
    console.log('[DEBUG] Partner Breakdown API - WHERE clause:', whereClause)

    // Pass full filters object (including category) to handle category filtering in outer query
    const queries = getPartnerBreakdownQueries(whereClause, filters)
    console.log('[DEBUG] Partner Breakdown API - pubCountOver200K query:', queries.pubCountOver200K)

    const [
      pubCountTimeSeries,
      categoryDistribution,
      pubCountOver200K,
      pubCountDetail
    ] = await Promise.all([
      BigQueryService.executeQuery(queries.pubCountTimeSeries),
      BigQueryService.executeQuery(queries.categoryDistribution),
      BigQueryService.executeQuery(queries.pubCountOver200K),
      BigQueryService.executeQuery(queries.pubCountDetail)
    ])

    return NextResponse.json({
      status: 'ok',
      data: {
        pubCountTimeSeries,
        categoryDistribution,
        pubCountOver200K,
        pubCountDetail
      }
    })
  } catch (error: any) {
    console.error('Error fetching Partner Breakdown data:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
