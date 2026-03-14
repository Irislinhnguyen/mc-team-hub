import { NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET() {
  try {
    const query = `
      SELECT MAX(date) as latest_date
      FROM \`gcpp-check.geniee.master_market\`
    `

    const result = await BigQueryService.executeQuery(query)

    if (!result || result.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'No data found' },
        { status: 404 }
      )
    }

    const latestDate = result[0]?.latest_date

    console.log('[Latest Date API] Raw date from BigQuery:', latestDate, 'Type:', typeof latestDate)

    // BigQuery date format handling
    let formattedDate = null
    if (latestDate) {
      // If it's already a string in YYYY-MM-DD format, use it directly
      if (typeof latestDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(latestDate)) {
        formattedDate = latestDate
      } else if (latestDate.value) {
        // BigQuery date object with .value property
        formattedDate = latestDate.value
      } else {
        // Try to parse as date
        try {
          const date = new Date(latestDate)
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0]
          }
        } catch (e) {
          console.error('Error parsing date:', latestDate, e)
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        latestDate: formattedDate,
        formattedDate
      }
    })
  } catch (error: any) {
    console.error('Error fetching latest date:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
