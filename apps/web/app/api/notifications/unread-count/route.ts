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

    const supabase = createAdminClient()

    // Get user's UUID from database (JWT uses email as sub, but DB needs UUID)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.sub)
      .single()

    const userUuid = userData?.id
    if (!userUuid) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const count = await getUnreadCount(userUuid)

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
