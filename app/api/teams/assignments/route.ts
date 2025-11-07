/**
 * GET /api/teams/assignments - Get all PIC assignments with tracking info
 */

import { NextResponse } from 'next/server'
import { getAllPicAssignments } from '../../../../lib/utils/teamMatcher'

export async function GET() {
  try {
    const assignments = await getAllPicAssignments()

    return NextResponse.json({
      status: 'ok',
      data: assignments
    })
  } catch (error) {
    console.error('Error fetching PIC assignments:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch assignments'
      },
      { status: 500 }
    )
  }
}
