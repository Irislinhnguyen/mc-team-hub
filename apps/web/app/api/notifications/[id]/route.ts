/**
 * Notification API - Dismiss notification
 * Endpoint: DELETE /api/notifications/:id
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

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

    // Dismiss and ensure it belongs to the user
    const { error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userUuid)

    if (error) {
      console.error('[Notification API] Error dismissing notification:', error)
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
