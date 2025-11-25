/**
 * Query Lab Sessions API
 *
 * GET - List all sessions for current user
 * POST - Create a new session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // Get sessions with optional status filter
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: sessions, error } = await supabase
      .from('query_lab_sessions')
      .select('id, title, status, created_at, updated_at, last_message_at, message_count')
      .eq('user_id', user.sub)
      .eq('status', status)
      .order('last_message_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Sessions API] Error fetching sessions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group sessions by date for UI
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const grouped = {
      today: [] as typeof sessions,
      yesterday: [] as typeof sessions,
      lastWeek: [] as typeof sessions,
      older: [] as typeof sessions
    }

    sessions?.forEach(session => {
      const sessionDate = new Date(session.last_message_at)
      sessionDate.setHours(0, 0, 0, 0)

      if (sessionDate >= today) {
        grouped.today.push(session)
      } else if (sessionDate >= yesterday) {
        grouped.yesterday.push(session)
      } else if (sessionDate >= lastWeek) {
        grouped.lastWeek.push(session)
      } else {
        grouped.older.push(session)
      }
    })

    return NextResponse.json({
      sessions,
      grouped,
      total: sessions?.length || 0
    })

  } catch (error: any) {
    console.error('[Sessions API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const body = await request.json().catch(() => ({}))

    // Create new session
    const { data: session, error } = await supabase
      .from('query_lab_sessions')
      .insert({
        user_id: user.sub,
        title: body.title || 'New Chat',
        metadata: body.metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('[Sessions API] Error creating session:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session })

  } catch (error: any) {
    console.error('[Sessions API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
