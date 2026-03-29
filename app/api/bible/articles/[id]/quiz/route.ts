/**
 * MC Bible - Quiz Submission API
 * POST: Submit quiz attempt for an article
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const articleId = params.id

    // Get user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse request body
    const body = await request.json()
    const { score, total_questions, answers } = body

    // Validate input
    if (
      typeof score !== 'number' ||
      typeof total_questions !== 'number' ||
      !Array.isArray(answers) ||
      score < 0 ||
      score > total_questions
    ) {
      return NextResponse.json({ error: 'Invalid quiz data' }, { status: 400 })
    }

    // Check if article exists
    const { data: article, error: articleError } = await supabase
      .from('bible_articles')
      .select('id, title')
      .eq('id', articleId)
      .single()

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Check if user already has an attempt for this article
    const { data: existingAttempt } = await supabase
      .from('bible_quiz_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()

    if (existingAttempt) {
      return NextResponse.json(
        { error: 'Quiz already attempted. Only one attempt allowed per article.' },
        { status: 400 }
      )
    }

    // Insert quiz attempt
    const { data: attempt, error: insertError } = await supabase
      .from('bible_quiz_attempts')
      .insert({
        user_id: userId,
        article_id: articleId,
        score,
        total_questions,
        answers,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving quiz attempt:', insertError)
      return NextResponse.json(
        { error: 'Failed to save quiz attempt' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      attempt: {
        id: attempt.id,
        score: attempt.score,
        total_questions: attempt.total_questions,
        percentage: Math.round((attempt.score / attempt.total_questions) * 100),
        completed_at: attempt.completed_at,
      },
    })
  } catch (error) {
    console.error('Error in quiz submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET: Retrieve quiz attempt for an article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const articleId = params.id

    // Get user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get quiz attempt
    const { data: attempt, error } = await supabase
      .from('bible_quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No attempt found
        return NextResponse.json({
          status: 'ok',
          hasAttempt: false,
        })
      }
      throw error
    }

    return NextResponse.json({
      status: 'ok',
      hasAttempt: true,
      attempt: {
        id: attempt.id,
        score: attempt.score,
        total_questions: attempt.total_questions,
        percentage: Math.round((attempt.score / attempt.total_questions) * 100),
        completed_at: attempt.completed_at,
      },
    })
  } catch (error) {
    console.error('Error fetching quiz attempt:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
