/**
 * Notifications API - User notification preferences
 * Endpoints: GET /api/notifications/preferences, PUT /api/notifications/preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { getUserPreferences, updateUserPreferences } from '@/lib/services/notificationService'

// GET - Fetch user notification preferences
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getUserPreferences(user.sub)

    return NextResponse.json({
      status: 'ok',
      preferences
    })
  } catch (error) {
    console.error('[Notifications API] Exception in GET preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, inapp } = body

    // Validate input
    if (typeof email !== 'object' || typeof inapp !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      )
    }

    const updated = await updateUserPreferences(user.sub, { email, inapp })

    return NextResponse.json({
      status: 'ok',
      message: 'Preferences updated',
      preferences: updated
    })
  } catch (error) {
    console.error('[Notifications API] Exception in PUT preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
