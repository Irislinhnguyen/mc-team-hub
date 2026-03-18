/**
 * Notifications API - Get unread notification count
 * Endpoint: GET /api/notifications/unread-count
 * Used for bell badge display
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { getUnreadCount } from '@/lib/services/notificationService'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await getUnreadCount(user.sub)

    return NextResponse.json({
      status: 'ok',
      count
    })
  } catch (error) {
    console.error('[Notifications API] Exception in GET unread-count:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
