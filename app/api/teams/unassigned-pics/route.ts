/**
 * POST /api/teams/unassigned-pics - Get PICs not assigned to any team
 * Body: { allPics: string[] } - All PICs from BigQuery
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnassignedPics } from '../../../../lib/utils/teamMatcher'

export async function POST(request: NextRequest) {
  try {
    const { allPics } = await request.json()

    if (!Array.isArray(allPics)) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing or invalid field: allPics must be an array'
        },
        { status: 400 }
      )
    }

    const unassignedPics = await getUnassignedPics(allPics)

    return NextResponse.json({
      status: 'ok',
      data: unassignedPics
    })
  } catch (error) {
    console.error('Error fetching unassigned PICs:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch unassigned PICs'
      },
      { status: 500 }
    )
  }
}
