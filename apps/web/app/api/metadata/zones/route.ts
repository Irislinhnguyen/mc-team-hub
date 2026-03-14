import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT DISTINCT
        zid as zone_id
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
      WHERE zid IS NOT NULL
      ORDER BY zid ASC
      LIMIT 1000
    `

    const rows = await BigQueryService.executeQuery(query)

    const zones = rows.map((row: any) => ({
      id: row.zone_id,
      label: row.zone_id || 'Unknown',
      value: row.zone_id,
    }))

    return NextResponse.json({
      status: 'ok',
      data: zones,
      count: zones.length,
    })
  } catch (error) {
    console.error('Error fetching zones:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch zones' },
      { status: 500 }
    )
  }
}
