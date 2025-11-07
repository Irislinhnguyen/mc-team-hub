import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT DISTINCT
        product as format_name
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
      WHERE product IS NOT NULL
      ORDER BY product ASC
      LIMIT 1000
    `

    const rows = await BigQueryService.executeQuery(query)

    const formats = rows.map((row: any) => ({
      id: row.format_name,
      label: row.format_name || 'Unknown',
      value: row.format_name,
    }))

    return NextResponse.json({
      status: 'ok',
      data: formats,
      count: formats.length,
    })
  } catch (error) {
    console.error('Error fetching formats:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch formats' },
      { status: 500 }
    )
  }
}
