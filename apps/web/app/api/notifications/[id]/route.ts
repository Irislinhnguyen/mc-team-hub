/**
 * Notification API - Dismiss notification
 * Endpoint: DELETE /api/notifications/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { dismissNotification } from '@/lib/services/notificationService'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notificationId = params.id

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    const success = await dismissNotification(notificationId, user.sub)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to dismiss notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Notification dismissed'
    })
  } catch (error) {
    console.error('[Notification API] Exception in DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
