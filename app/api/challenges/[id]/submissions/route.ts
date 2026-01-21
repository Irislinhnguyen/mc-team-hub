/**
 * Submissions API - Challenge Submission Management
 * Endpoints: GET (list submissions), POST (start attempt)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager, isLeaderOrAbove } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoGradeSubmission } from '@/lib/grading/autoGrading'

// =====================================================
// GET - List submissions for a challenge
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

    // Only Admin/Manager/Leader can view all submissions
    if (!isLeaderOrAbove(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const challengeId = params.id
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status')
    const team = searchParams.get('team')

    // Build query
    let query = supabase
      .from('challenge_submissions')
      .select(`
        *,
        user:users(id, name, email),
        answers:challenge_answers(
          id,
          question_id,
          is_auto_graded,
          auto_score,
          manual_score
        )
      `)
      .eq('challenge_id', challengeId)
      .order('submitted_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (team && user.role === 'leader') {
      // Leaders can only see their team's submissions
      query = query.eq('user_team_id', team)
    }

    const { data: submissions, error } = await query

    if (error) {
      console.error('[Submissions API] Error fetching submissions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      submissions: submissions || [],
    })
  } catch (error) {
    console.error('[Submissions API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Start a new challenge attempt
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

    const challengeId = params.id
    const supabase = createAdminClient()

    // Get challenge details
    const { data: challenge } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check if challenge is open
    if (challenge.status !== 'open') {
      return NextResponse.json({
        error: 'Challenge is not open for submissions',
        status: challenge.status,
      }, { status: 400 })
    }

    // Check time window
    const now = new Date()
    const openDate = new Date(challenge.open_date)
    const closeDate = new Date(challenge.close_date)

    if (now < openDate) {
      return NextResponse.json({
        error: 'Challenge has not opened yet',
        open_date: challenge.open_date,
      }, { status: 400 })
    }

    if (now > closeDate) {
      return NextResponse.json({
        error: 'Challenge has closed',
        close_date: challenge.close_date,
      }, { status: 400 })
    }

    // Check if user has remaining attempts
    const { count: attemptCount, error: countError } = await supabase
      .from('challenge_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challengeId)
      .eq('user_id', user.sub)

    if (countError) {
      console.error('[Submissions API] Error counting attempts:', countError)
    }

    if ((attemptCount || 0) >= challenge.max_attempts) {
      return NextResponse.json({
        error: 'Maximum attempts reached',
        max_attempts: challenge.max_attempts,
      }, { status: 400 })
    }

    // Get user's team ID
    const { data: teamAssignment } = await supabase
      .from('user_team_assignments')
      .select('team_id')
      .eq('user_id', user.sub)
      .single()

    // Create submission
    const { data: submission, error: insertError } = await supabase
      .from('challenge_submissions')
      .insert({
        challenge_id: challengeId,
        user_id: user.sub,
        attempt_number: (attemptCount || 0) + 1,
        user_team_id: teamAssignment?.team_id || null,
        status: 'in_progress',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Submissions API] Error creating submission:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      submission: {
        ...submission,
        challenge: {
          id: challenge.id,
          name: challenge.name,
          description: challenge.description,
          duration_minutes: challenge.duration_minutes,
          close_date: challenge.close_date,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Submissions API] Error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
