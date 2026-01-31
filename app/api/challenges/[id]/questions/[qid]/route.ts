/**
 * Single Question API - Delete and Update individual questions
 * Endpoints: PATCH (update), DELETE (remove)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

// =====================================================
// Validation Schema
// =====================================================

const updateQuestionSchema = z.object({
  display_order: z.number().int().optional(),
})

// =====================================================
// PATCH - Update question (display order)
// =====================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; qid: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can update questions
    requireAdminOrManager(user)

    const challengeId = params.id
    const questionId = params.qid
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
        error: 'Can only modify questions in draft challenges',
      }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateQuestionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data

    // Update question
    const { data: question, error } = await supabase
      .from('challenge_questions')
      .update({
        display_order: data.display_order,
      })
      .eq('id', questionId)
      .eq('challenge_id', challengeId)
      .select()
      .single()

    if (error) {
      console.error('[Question API] Error updating question:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: 'ok',
      question,
    })
  } catch (error: any) {
    console.error('[Question API] Error in PATCH:', error)

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

// =====================================================
// DELETE - Remove question from challenge
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; qid: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can delete questions
    requireAdminOrManager(user)

    const challengeId = params.id
    const questionId = params.qid
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
        error: 'Can only delete questions from draft challenges',
      }, { status: 400 })
    }

    // Delete question
    const { error } = await supabase
      .from('challenge_questions')
      .delete()
      .eq('id', questionId)
      .eq('challenge_id', challengeId)

    if (error) {
      console.error('[Question API] Error deleting question:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Question deleted successfully',
    })
  } catch (error: any) {
    console.error('[Question API] Error in DELETE:', error)

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
