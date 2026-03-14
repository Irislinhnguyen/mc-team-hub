/**
 * Bible Article Progress API - Mark articles as complete/incomplete
 * Endpoints: POST (mark complete), DELETE (mark incomplete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

// =====================================================
// POST - Mark article as completed
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const articleId = params.id

    // Verify article exists
    const { data: article } = await supabase
      .from('bible_articles')
      .select('id')
      .eq('id', articleId)
      .single()

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Check if already completed
    const { data: existing } = await supabase
      .from('bible_user_progress')
      .select('id')
      .eq('user_id', user.sub)
      .eq('article_id', articleId)
      .single()

    if (existing) {
      return NextResponse.json({
        status: 'ok',
        message: 'Article already marked as completed',
        progress: existing,
      })
    }

    // Mark as completed
    const { data: progress, error } = await supabase
      .from('bible_user_progress')
      .insert({
        user_id: user.sub,
        article_id: articleId,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bible Progress API] Error marking complete:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Article marked as completed',
      progress,
    })
  } catch (error) {
    console.error('[Bible Progress API] Error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// DELETE - Mark article as incomplete (remove progress)
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const articleId = params.id

    // Remove progress entry
    const { error } = await supabase
      .from('bible_user_progress')
      .delete()
      .eq('user_id', user.sub)
      .eq('article_id', articleId)

    if (error) {
      console.error('[Bible Progress API] Error removing progress:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Article marked as incomplete',
    })
  } catch (error) {
    console.error('[Bible Progress API] Error in DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
