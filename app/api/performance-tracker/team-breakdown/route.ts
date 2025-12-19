import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildWhereClause, buildTeamBreakdownQuery } from '../../../../lib/services/analyticsQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()

    console.log('[team-breakdown] Received filters:', filters)

    // Build WHERE clause from filters
    const whereClause = await buildWhereClause(filters)

    console.log('[team-breakdown] WHERE clause:', whereClause)

    // Build team breakdown query with server-side aggregation
    const teamBreakdownQuery = await buildTeamBreakdownQuery(whereClause)

    console.log('[team-breakdown] Executing query...')

    // Execute team breakdown query
    const teamBreakdownData = await BigQueryService.executeQuery(teamBreakdownQuery)
    console.log('[team-breakdown] Returned', teamBreakdownData.length, 'rows')

    // Transform to consistent format
    const transformedData = teamBreakdownData.map(row => ({
      date: row.date,
      rawDate: row.date, // For chart compatibility (date formatting)
      team_id: row.team_id,
      team_name: row.team_name,
      revenue: Number(row.revenue || 0),
      profit: Number(row.profit || 0),
      requests: Number(row.requests || 0),
      paid: Number(row.paid || 0)
    }))

    return NextResponse.json({
      status: 'ok',
      data: {
        teamBreakdown: transformedData,
        metadata: {
          rowCount: transformedData.length,
          generatedAt: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error('[team-breakdown] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
