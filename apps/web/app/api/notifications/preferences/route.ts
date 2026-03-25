/**
 * Notifications API - User notification preferences
 * Endpoints: GET /api/notifications/preferences, PUT /api/notifications/preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

// GET - Fetch user notification preferences
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

    // Fetch preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_enabled, inapp_enabled')
      .eq('user_id', userUuid)
      .single()

    const preferences = prefs || {
      email: { challenge: true, bible: true, system: true, team: true },
      inapp: { challenge: true, bible: true, system: true, team: true }
    }

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

    // Update preferences
    const { data: updated } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userUuid,
        email_enabled: email,
        inapp_enabled: inapp,
        updated_at: new Date().toISOString()
      })
      .select('email_enabled, inapp_enabled')
      .single()

    return NextResponse.json({
      status: 'ok',
      message: 'Preferences updated',
      preferences: {
        email: updated?.email_enabled,
        inapp: updated?.inapp_enabled
      }
    })
  } catch (error) {
    console.error('[Notifications API] Exception in PUT preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
