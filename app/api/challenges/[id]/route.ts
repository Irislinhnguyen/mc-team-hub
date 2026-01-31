/**
 * Challenge Detail API - Single Challenge Operations
 * Endpoints: GET (detail), PUT (update), DELETE (delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  UpdateChallengeRequest,
  Challenge,
  ChallengeStatus,
} from '@/lib/types/challenge'
import { z } from 'zod'

// =====================================================
// Validation Schema
// =====================================================

const updateChallengeSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  open_date: z.string().datetime().optional(),
  close_date: z.string().datetime().optional(),
  duration_minutes: z.number().min(1).max(480).optional(),
  max_attempts: z.number().min(1).max(10).optional(),
  status: z.enum(['draft', 'scheduled', 'open', 'closed', 'grading', 'completed']).optional(),
})

// =====================================================
// GET - Get single challenge detail
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

    // Fetch challenge - explicitly select columns to avoid foreign key issues
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('id, name, description, open_date, close_date, duration_minutes, max_attempts, status, leaderboard_published_at, leaderboard_published_by, created_by, updated_by, created_at, updated_at')
      .eq('id', challengeId)
      .single()

    if (error || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Fetch creator name separately
    let creatorName: string | undefined
    let publisherName: string | undefined
    if (challenge.created_by) {
      const { data: creator } = await supabase
        .from('users')
        .select('name')
        .eq('id', challenge.created_by)
        .single()
      creatorName = creator?.name
    }
    if (challenge.leaderboard_published_by) {
      const { data: publisher } = await supabase
        .from('users')
        .select('name')
        .eq('id', challenge.leaderboard_published_by)
        .single()
      publisherName = publisher?.name
    }

    // Check access permission
    const canView =
      ['admin', 'manager'].includes(user.role) ||
      ['open', 'closed', 'grading', 'completed'].includes(challenge.status) ||
      (user.role === 'leader' && ['closed', 'grading', 'completed'].includes(challenge.status))

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get question count
    const { count: questionCount } = await supabase
      .from('challenge_questions')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challengeId)

    // Get submission count
    const { count: submissionCount } = await supabase
      .from('challenge_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challengeId)

    // Format response
    const formattedChallenge: Challenge = {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      open_date: challenge.open_date,
      close_date: challenge.close_date,
      duration_minutes: challenge.duration_minutes,
      max_attempts: challenge.max_attempts,
      status: challenge.status,
      leaderboard_published_at: challenge.leaderboard_published_at,
      leaderboard_published_by: challenge.leaderboard_published_by,
      created_by: challenge.created_by,
      updated_by: challenge.updated_by,
      created_at: challenge.created_at,
      updated_at: challenge.updated_at,
      question_count: questionCount || 0,
      submission_count: submissionCount || 0,
      creator_name: creatorName,
      publisher_name: publisherName,
    }

    return NextResponse.json({
      status: 'ok',
      challenge: formattedChallenge,
    })
  } catch (error) {
    console.error('[Challenge API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - Update challenge
// =====================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can update challenges
    requireAdminOrManager(user)

    const challengeId = params.id
    const supabase = createAdminClient()

    // Check if challenge exists
    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', challengeId)
      .single()

    if (!existingChallenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateChallengeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data

    // Validate dates if both provided
    if (data.open_date && data.close_date) {
      const openDate = new Date(data.open_date)
      const closeDate = new Date(data.close_date)
      if (closeDate <= openDate) {
        return NextResponse.json({
          error: 'Validation failed',
          details: { close_date: ['Close date must be after open date'] },
        }, { status: 400 })
      }
    }

    // Build update object
    const updateData: any = {
      ...data,
      updated_by: user.sub,
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    // Update challenge
    const { data: challenge, error } = await supabase
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId)
      .select()
      .single()

    if (error) {
      console.error('[Challenge API] Error updating challenge:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      challenge,
    })
  } catch (error: any) {
    console.error('[Challenge API] Error in PUT:', error)

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
// DELETE - Delete challenge
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

    // Only Admin/Manager can delete challenges
    requireAdminOrManager(user)

    const challengeId = params.id
    const supabase = createAdminClient()

    // Check if challenge exists and can be deleted
    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', challengeId)
      .single()

    if (!existingChallenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Cannot delete if already open or completed
    if (['open', 'closed', 'grading', 'completed'].includes(existingChallenge.status)) {
      return NextResponse.json({
        error: 'Cannot delete challenge that has been opened or completed',
      }, { status: 400 })
    }

    // Delete challenge (cascade will delete related records)
    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', challengeId)

    if (error) {
      console.error('[Challenge API] Error deleting challenge:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Challenge deleted successfully',
    })
  } catch (error: any) {
    console.error('[Challenge API] Error in DELETE:', error)

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
