/**
 * Focus Dashboard API
 * GET - Get dashboard metrics for a focus
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { getFocusDashboard } from '@/lib/services/focusService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const focusId = params.id

    const result = await getFocusDashboard(focusId)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: result.metrics,
    })
  } catch (error) {
    console.error('Error in GET /api/focus-of-month/[id]/dashboard:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
