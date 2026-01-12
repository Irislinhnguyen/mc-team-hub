/**
 * Focus of the Month API - Publish focus
 * POST - Publish a draft focus
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { publishFocus } from '@/lib/services/focusService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const focusId = params.id

    const result = await publishFocus(focusId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: result.focus,
      message: 'Focus published successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/focus-of-month/[id]/publish:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
