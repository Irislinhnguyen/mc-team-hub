/**
 * Notifications API - List user notifications
 * Endpoint: GET /api/notifications
 * Query params: page (default 1), limit (default 20)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    const supabase = createAdminClient()

    // Fetch notifications (not dismissed, ordered by created_at DESC)
    const { data: notifications, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.sub)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Notifications API] Error fetching notifications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    console.error('[Notifications API] Exception in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
