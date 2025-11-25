/**
 * Query Lab Session Messages API
 *
 * POST - Add a message to session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/auth/server'
import { getOpenAIAnalyzer } from '@/lib/services/openai'

type Params = { params: Promise<{ id: string }> }

/**
 * Generate a quick fallback title (rule-based, no AI)
 */
function generateFallbackTitle(content: string): string {
  let title = content
    .replace(/^(show|find|get|list|display|what|how|can you|please|tìm|hiển thị|liệt kê|cho tôi|xem|cho|mình|tôi|thôi)\s+/i, '')
    .replace(/[?!.,]+$/, '')
    .trim()

  title = title.charAt(0).toUpperCase() + title.slice(1)

  if (title.length > 50) {
    title = title.substring(0, 47) + '...'
  }

  if (!title) {
    title = `Query ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  }

  return title
}

/**
 * Generate AI title in background without blocking the response
 */
async function generateAITitleInBackground(
  analyzer: any,
  sessionId: string,
  content: string,
  supabase: any
): Promise<void> {
  try {
    console.log('[Messages API] Generating AI title in background for session:', sessionId)
    const aiTitle = await analyzer.generateSessionTitle(content)

    const { error } = await supabase
      .from('query_lab_sessions')
      .update({ title: aiTitle })
      .eq('id', sessionId)

    if (error) {
      console.error('[Messages API] Error updating AI title:', error)
    } else {
      console.log('[Messages API] AI title updated successfully:', aiTitle)
    }
  } catch (error) {
    console.error('[Messages API] AI title generation in background failed:', error)
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: sessionId } = await params
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const body = await request.json()

    // Verify session ownership
    const { data: session } = await supabase
      .from('query_lab_sessions')
      .select('id, title, message_count')
      .eq('id', sessionId)
      .eq('user_id', user.sub)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Add message
    const { data: message, error } = await supabase
      .from('query_lab_messages')
      .insert({
        session_id: sessionId,
        role: body.role,
        content: body.content,
        message_type: body.message_type,
        sql: body.sql,
        results: body.results,
        row_count: body.row_count,
        confidence: body.confidence,
        warnings: body.warnings,
        result_title: body.result_title,
        retry_info: body.retry_info,
        kg_info: body.kg_info
      })
      .select()
      .single()

    if (error) {
      console.error('[Messages API] Error adding message:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-generate title from first user message
    // Use immediate fallback title, then update with AI in background
    // Check title instead of message_count to avoid race condition with DB trigger
    let newTitle: string | undefined
    if (session.title === 'New Chat' && body.role === 'user') {
      // Generate quick fallback title immediately (no AI delay)
      const analyzer = getOpenAIAnalyzer()
      const fallbackTitle = generateFallbackTitle(body.content)

      // Update DB with fallback title immediately
      const { error: updateError } = await supabase
        .from('query_lab_sessions')
        .update({ title: fallbackTitle })
        .eq('id', sessionId)

      if (updateError) {
        console.error('[Messages API] Error updating fallback title:', updateError)
      } else {
        console.log('[Messages API] Fallback title set:', fallbackTitle)
        newTitle = fallbackTitle
      }

      // Generate AI title in background (don't await - fire and forget)
      generateAITitleInBackground(analyzer, sessionId, body.content, supabase)
        .catch(err => console.error('[Messages API] Background AI title generation failed:', err))
    }

    return NextResponse.json({ message, newTitle })

  } catch (error: any) {
    console.error('[Messages API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
