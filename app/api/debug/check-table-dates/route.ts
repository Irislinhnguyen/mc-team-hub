import { NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET() {
  try {
    const tables = [
      'agg_monthly_with_pic_table',
      'agg_monthly_with_pic_table_6_month'
    ]

    const results = []

    for (const table of tables) {
      const query = `
        SELECT
          '${table}' as table_name,
          MIN(DATE) as min_date,
          MAX(DATE) as max_date,
          COUNT(*) as total_rows,
          COUNT(DISTINCT pic) as unique_pics,
          COUNT(DISTINCT pid) as unique_pids,
          SUM(rev) as total_revenue,
          SUM(req) as total_requests
        FROM \`gcpp-check.GI_publisher.${table}\`
      `

      try {
        const [data] = await BigQueryService.executeQuery(query)
        if (data) {
          results.push({
            table,
            ...data,
            min_date: data.min_date?.value || data.min_date,
            max_date: data.max_date?.value || data.max_date
          })
        }
      } catch (error: any) {
        results.push({
          table,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      status: 'ok',
      data: results
    })

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 })
  }
}
