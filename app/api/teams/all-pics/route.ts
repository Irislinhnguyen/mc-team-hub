/**
 * GET /api/teams/all-pics - Get all distinct PICs from BigQuery
 */

import { NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT pic
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE pic IS NOT NULL AND pic != ''
      ORDER BY pic ASC
    `

    const results = await BigQueryService.executeQuery(query)
    const picNames = results.map((row: any) => row.pic)

    return NextResponse.json({
      status: 'ok',
      data: picNames
    })
  } catch (error) {
    console.error('Error fetching all PICs:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch PICs from BigQuery'
      },
      { status: 500 }
    )
  }
}
