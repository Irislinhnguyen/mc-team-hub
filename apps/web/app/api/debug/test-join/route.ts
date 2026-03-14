import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    // Test the exact query without any WHERE clause
    const query = `
      SELECT
        nsm.pic,
        bp.pid,
        bp.pubname,
        bp.start_date,
        bp.end_date,
        bp.month,
        bp.year
      FROM \`gcpp-check.GI_publisher.newsales_by_pid\` bp
      INNER JOIN \`gcpp-check.GI_publisher.new_sales_master\` nsm ON bp.pid = nsm.pid
      LIMIT 5
    `

    const rows = await BigQueryService.executeQuery(query)

    return NextResponse.json({
      status: 'ok',
      count: rows.length,
      sample: rows.map(r => ({
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
