/**
 * Questions API - Question Management
 * Endpoints: GET (list), POST (add question)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CreateQuestionRequest,
  ChallengeQuestion,
} from '@/lib/types/challenge'
import { z } from 'zod'

// =====================================================
// Validation Schema
// =====================================================

const createQuestionSchema = z.object({
  question_type: z.enum(['essay', 'cloze', 'drag_drop']),
  question_text: z.string().min(5, 'Question text must be at least 5 characters').max(5000),
  options: z.object({
    type: z.enum(['essay', 'cloze', 'drag_drop']),
  }).passthrough(),
  points: z.number().min(1).max(100).optional().default(1),
  display_order: z.number().int().optional(),
  media_url: z.string().url().optional().nullable(),
})

// =====================================================
// GET - List questions for a challenge
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const challengeId = params.id
    const supabase = createAdminClient()

    // Check if challenge exists and user has access
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, status, created_by')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check access permission
    const canView =
      ['admin', 'manager'].includes(user.role) ||
      ['open', 'closed', 'grading', 'completed'].includes(challenge.status) ||
      (user.role === 'leader' && ['closed', 'grading', 'completed'].includes(challenge.status))

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch questions
    const { data: questions, error } = await supabase
      .from('challenge_questions')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[Questions API] Error fetching questions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      questions: questions || [],
    })
  } catch (error) {
    console.error('[Questions API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Add question to challenge
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

    // Only Admin/Manager can add questions
    requireAdminOrManager(user)

    const challengeId = params.id
    const supabase = createAdminClient()

    // Check if challenge exists and is in draft status
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.status !== 'draft') {
      return NextResponse.json({
        error: 'Can only add questions to draft challenges',
      }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createQuestionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data

    // Get next display order if not provided
    let displayOrder = data.display_order
    if (displayOrder === undefined) {
      const { data: lastQuestion } = await supabase
        .from('challenge_questions')
        .select('display_order')
        .eq('challenge_id', challengeId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      displayOrder = lastQuestion ? lastQuestion.display_order + 1 : 0
    }

    // Prepare correct_answer based on question type
    let correctAnswer: any = null
    if (data.question_type === 'cloze') {
      // For cloze, store the correct indices
      const options = data.options as any
      if (options.gaps) {
        correctAnswer = {
          gaps: options.gaps.map((g: any) => ({
            id: g.id,
            correct_index: g.correct_index,
          })),
        }
      }
    } else if (data.question_type === 'drag_drop') {
      // For drag-drop, store correct mappings
      const options = data.options as any
      if (options.zones) {
        correctAnswer = {
          zones: options.zones.map((z: any) => ({
            id: z.id,
            correct_item_ids: z.correct_item_ids,
          })),
        }
      }
    }

    // Create question
    const { data: question, error } = await supabase
      .from('challenge_questions')
      .insert({
        challenge_id: challengeId,
        question_type: data.question_type,
        question_text: data.question_text,
        options: data.options,
        correct_answer: correctAnswer,
        points: data.points,
        display_order: displayOrder,
        media_url: data.media_url,
      })
      .select()
      .single()

    if (error) {
      console.error('[Questions API] Error creating question:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      question,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Questions API] Error in POST:', error)

    // Handle permission errors
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
