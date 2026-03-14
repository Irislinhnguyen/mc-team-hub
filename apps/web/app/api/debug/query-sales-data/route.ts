import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    // Query that joins newsales_by_pid with new_sales_master (like the actual queries)
    const query = `
      SELECT
        nsm.pic,
        bp.pid,
        bp.pubname,
        bp.start_date,
        bp.end_date,
        bp.month,
        bp.year,
        bp.sales_rev,
        bp.cs_rev
      FROM \`gcpp-check.GI_publisher.newsales_by_pid\` bp
      INNER JOIN \`gcpp-check.GI_publisher.new_sales_master\` nsm ON bp.pid = nsm.pid
      LIMIT 10
    `

    const rows = await BigQueryService.executeQuery(query)

    return NextResponse.json({
      status: 'ok',
      count: rows.length,
      data: rows
    })
  } catch (error) {
    console.error('[Debug API] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
