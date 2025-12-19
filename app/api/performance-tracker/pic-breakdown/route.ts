import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildWhereClause, buildPICBreakdownQuery } from '../../../../lib/services/analyticsQueries'

export async function POST(request: NextRequest) {
  try {
    const { team_id, ...filters } = await request.json()

    if (!team_id) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'team_id is required'
        },
        { status: 400 }
      )
    }

    console.log('[pic-breakdown] Received filters for team:', team_id, filters)

    // Build WHERE clause from filters
    const whereClause = await buildWhereClause(filters)

    console.log('[pic-breakdown] WHERE clause:', whereClause)

    // Build PIC breakdown query for specific team
    const picBreakdownQuery = await buildPICBreakdownQuery(team_id, whereClause)

    console.log('[pic-breakdown] Executing query...')

    // Execute query
    const picBreakdownData = await BigQueryService.executeQuery(picBreakdownQuery)

    console.log('[pic-breakdown] Returned', picBreakdownData.length, 'rows for team:', team_id)

    // Transform to consistent format
    const transformedData = picBreakdownData.map(row => ({
      date: row.date,
      rawDate: row.date, // For chart compatibility
      pic_name: row.pic_name,
      revenue: Number(row.revenue || 0),
      profit: Number(row.profit || 0),
      requests: Number(row.requests || 0),
      paid: Number(row.paid || 0)
    }))

    return NextResponse.json({
      status: 'ok',
      data: {
        picBreakdown: transformedData,
        metadata: {
          team_id,
          rowCount: transformedData.length,
          generatedAt: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error('[pic-breakdown] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
