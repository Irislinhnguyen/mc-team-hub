import { NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET() {
  try {
    // Fetch all distinct dates from BigQuery
    const result = await BigQueryService.executeQuery(`
      SELECT DISTINCT date
      FROM \`gcpp-check.geniee.master_market\`
      WHERE date IS NOT NULL
      ORDER BY date DESC
    `)

    // Extract dates into array of strings (YYYY-MM-DD format)
    const dates = result.map((row: any) => row.date)

    return NextResponse.json({
      status: 'ok',
      data: {
        dates,
        count: dates.length,
        latestDate: dates.length > 0 ? dates[0] : null,
        earliestDate: dates.length > 0 ? dates[dates.length - 1] : null
      }
    })
  } catch (error: any) {
    console.error('Error fetching available dates:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
