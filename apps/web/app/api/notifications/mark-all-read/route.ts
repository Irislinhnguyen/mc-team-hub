/**
 * Notifications API - Mark all notifications as read
 * Endpoint: POST /api/notifications/mark-all-read
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

export async function POST(request: NextRequest) {
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

    // Mark all as read
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userUuid)
      .is('read_at', null)
      .select('id')

    if (error) {
      console.error('[Notifications API] Error marking all as read:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const count = data?.length || 0

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
