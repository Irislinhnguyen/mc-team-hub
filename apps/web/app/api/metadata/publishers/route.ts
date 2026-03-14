import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT DISTINCT
        pid,
        pubname
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
      WHERE pid IS NOT NULL
        AND pubname IS NOT NULL
      ORDER BY pubname ASC
      LIMIT 1000
    `

    const rows = await BigQueryService.executeQuery(query)

    const publishers = rows.map((row: any) => ({
      id: row.pid,
      label: row.pubname || row.pid,
      value: row.pid,
    }))

    return NextResponse.json({
      status: 'ok',
      data: publishers,
      count: publishers.length,
    })
  } catch (error) {
    console.error('Error fetching publishers:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch publishers' },
      { status: 500 }
    )
  }
}
