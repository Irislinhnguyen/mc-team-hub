import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { getNewSalesQueries } from '../../../../lib/services/analyticsQueries'

export async function GET(request: NextRequest) {
  try {
    // Get the actual query with filters
    const queries = await getNewSalesQueries({})

    // Execute the actual salesCsBreakdown query
    const rows = await BigQueryService.executeQuery(queries.salesCsBreakdown)

    return NextResponse.json({
      status: 'ok',
      count: rows.length,
      sample: rows.slice(0, 5).map(r => ({
        has_pic: 'pic' in r,
        pic: r.pic,
        pid: r.pid,
        pubname: r.pubname,
        all_keys: Object.keys(r)
      }))
    })
  } catch (error) {
    console.error('[Debug Test] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
