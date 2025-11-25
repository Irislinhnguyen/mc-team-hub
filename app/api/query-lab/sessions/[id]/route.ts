/**
 * Query Lab Session Detail API
 *
 * GET - Get session with messages
 * PATCH - Update session (rename, archive)
 * DELETE - Delete session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/auth/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('query_lab_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.sub)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('query_lab_messages')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('[Session API] Error fetching messages:', messagesError)
    }

    return NextResponse.json({
      session,
      messages: messages || []
    })

  } catch (error: any) {
    console.error('[Session API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const body = await request.json()

    // Verify ownership
    const { data: existing } = await supabase
      .from('query_lab_sessions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.sub)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update allowed fields only
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updates.title = body.title
    if (body.status !== undefined) updates.status = body.status

    const { data: session, error } = await supabase
      .from('query_lab_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Session API] Error updating session:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session })

  } catch (error: any) {
    console.error('[Session API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // Verify ownership and delete
    const { error } = await supabase
      .from('query_lab_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.sub)

    if (error) {
      console.error('[Session API] Error deleting session:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[Session API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
