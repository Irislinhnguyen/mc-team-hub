/**
 * Grading API - Essay Answer Grading for Leaders/Managers
 * Endpoints: GET (grading queue), POST (bulk grade)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isLeaderOrAbove, isAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

// =====================================================
// GET - Get grading queue (ungraded essay answers)
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

    // Only Admin/Manager/Leader can access grading
    if (!isLeaderOrAbove(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const challengeId = params.id
    const supabase = createAdminClient()

    // Check if challenge exists
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Get essay questions for this challenge
    const { data: essayQuestions } = await supabase
      .from('challenge_questions')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('question_type', 'essay')

    const essayQuestionIds = essayQuestions?.map((q) => q.id) || []

    if (essayQuestionIds.length === 0) {
      return NextResponse.json({
        status: 'ok',
        grading_queue: [],
        pending_count: 0,
      })
    }

    // Build query for ungraded essay answers
    let query = supabase
      .from('challenge_answers')
      .select(`
        *,
        question:challenge_questions(id, question_text, points),
        submission:challenge_submissions(
          id,
          user_id,
          user_team_id,
          submitted_at,
          user:users(id, name, email)
        )
      `)
      .in('question_id', essayQuestionIds)
      .is('manual_score', null)
      .order('created_at', { ascending: true })

    // For leaders, filter to their team only
    if (user.role === 'leader') {
      // Get leader's team
      const { data: leaderTeams } = await supabase
        .from('user_team_assignments')
        .select('team_id')
        .eq('user_id', user.sub)
        .eq('role', 'leader')

      const leaderTeamIds = leaderTeams?.map((lt) => lt.team_id) || []

      if (leaderTeamIds.length > 0) {
        // Filter by team - need to use a subquery approach
        const { data: teamSubmissions } = await supabase
          .from('challenge_submissions')
          .select('id')
          .eq('challenge_id', challengeId)
          .in('user_team_id', leaderTeamIds)

        const teamSubmissionIds = teamSubmissions?.map((s) => s.id) || []
        query = query.in('submission_id', teamSubmissionIds)
      } else {
        // Leader has no team assigned, return empty
        return NextResponse.json({
          status: 'ok',
          grading_queue: [],
          pending_count: 0,
        })
      }
    }

    const { data: answers, error } = await query

    if (error) {
      console.error('[Grading API] Error fetching grading queue:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format grading queue items
    const gradingQueue = (answers || []).map((answer: any) => ({
      id: answer.id,
      answer_id: answer.id,
      challenge_id: challengeId,
      question_id: answer.question_id,
      submission_id: answer.submission_id,
      user_id: answer.submission?.user_id,
      user_name: answer.submission?.user?.name,
      user_email: answer.submission?.user?.email,
      team_id: answer.submission?.user_team_id,
      question_text: answer.question?.question_text,
      question_type: 'essay',
      answer_text: answer.answer_text,
      current_score: answer.manual_score || answer.auto_score,
      max_score: answer.question?.points || 1,
      graded_by: answer.graded_by,
      graded_at: answer.graded_at,
      created_at: answer.created_at,
    }))

    return NextResponse.json({
      status: 'ok',
      grading_queue: gradingQueue,
      pending_count: gradingQueue.length,
    })
  } catch (error) {
    console.error('[Grading API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Bulk grade answers
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

    // Only Admin/Manager/Leader can grade
    if (!isLeaderOrAbove(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const challengeId = params.id
    const supabase = createAdminClient()

    const body = await request.json()
    const { grades } = body // Expected: [{ answer_id, score, feedback }]

    if (!Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({
        error: 'Invalid request',
        details: { grades: ['Must be a non-empty array'] },
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Validate scores and update answers
    const updatePromises = grades.map(async (grade: any) => {
      const { answer_id, score, feedback } = grade

      if (typeof score !== 'number' || score < 0) {
        throw new Error(`Invalid score for answer ${answer_id}`)
      }

      // Get answer to check question type and max score
      const { data: answer } = await supabase
        .from('challenge_answers')
        .select(`
          *,
          question:challenge_questions(points, question_type)
        `)
        .eq('id', answer_id)
        .single()

      if (!answer) {
        throw new Error(`Answer ${answer_id} not found`)
      }

      // Only update essay questions
      if (answer.question?.question_type !== 'essay') {
        throw new Error(`Answer ${answer_id} is not an essay question`)
      }

      // Check if leader can grade this (team filter)
      if (user.role === 'leader') {
        const { data: submission } = await supabase
          .from('challenge_submissions')
          .select('user_team_id')
          .eq('id', answer.submission_id)
          .single()

        if (submission) {
          const { data: leaderTeam } = await supabase
            .from('user_team_assignments')
            .select('team_id')
            .eq('user_id', user.sub)
            .eq('role', 'leader')
            .single()

          if (!leaderTeam || leaderTeam.team_id !== submission.user_team_id) {
            throw new Error(`Forbidden: Cannot grade answer ${answer_id}`)
          }
        }
      }

      // Update answer with grade
      const updateData: any = {
        manual_score: score,
        manual_feedback: feedback || null,
        graded_by: user.sub,
        graded_at: now,
      }

      // Manager override tracking
      if (isAdminOrManager(user) && answer.graded_by && answer.graded_by !== user.sub) {
        updateData.grading_modified_by = user.sub
        updateData.grading_modified_at = now
      }

      return supabase
        .from('challenge_answers')
        .update(updateData)
        .eq('id', answer_id)
    })

    try {
      await Promise.all(updatePromises)
    } catch (error: any) {
      return NextResponse.json({
        error: error.message,
      }, { status: 400 })
    }

    // Recalculate submission scores for affected answers
    const submissionIds = new Set(grades.map((g: any) => {
      // Extract submission_id from answer
      // Need to query separately
      return g.submission_id
    }).filter(Boolean))

    for (const submissionId of submissionIds) {
      await recalculateSubmissionScore(supabase, submissionId)
    }

    return NextResponse.json({
      status: 'ok',
      graded: grades.length,
      message: `Graded ${grades.length} answer(s) successfully`,
    })
  } catch (error) {
    console.error('[Grading API] Error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Recalculate and update submission score
 */
async function recalculateSubmissionScore(supabase: any, submissionId: string) {
  // Get all answers for this submission
  const { data: answers } = await supabase
    .from('challenge_answers')
    .select(`
      manual_score,
      auto_score,
      question:challenge_questions(points)
    `)
    .eq('submission_id', submissionId)

  if (!answers || answers.length === 0) return

  // Calculate total score (prefer manual_score over auto_score)
  let totalScore = 0
  let maxScore = 0
  let hasUngradedEssay = false

  for (const answer of answers) {
    const score = answer.manual_score ?? answer.auto_score ?? 0
    const points = answer.question?.points || 1

    totalScore += score
    maxScore += points

    // Check for ungraded essay
    if (answer.manual_score === null && answer.question?.question_type === 'essay') {
      hasUngradedEssay = true
    }
  }

  // Get submission to check its current state
  const { data: submission } = await supabase
    .from('challenge_submissions')
    .select('status')
    .eq('id', submissionId)
    .single()

  const newStatus = hasUngradedEssay ? 'submitted' : 'graded'

  // Update submission
  await supabase
    .from('challenge_submissions')
    .update({
      final_score: totalScore,
      final_score_max: maxScore,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
}
