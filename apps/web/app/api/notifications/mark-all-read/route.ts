/**
 * Notifications API - Mark all notifications as read
 * Endpoint: POST /api/notifications/mark-all-read
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { markAllAsRead } from '@/lib/services/notificationService'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await markAllAsRead(user.sub)

    return NextResponse.json({
      status: 'ok',
      message: `Marked ${count} notification(s) as read`,
      count
    })
  } catch (error) {
    console.error('[Notifications API] Exception in POST mark-all-read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
