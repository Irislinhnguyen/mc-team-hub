/**
 * Submission Detail API - Individual Submission Operations
 * Endpoints: GET (detail), PUT (update answers/submit)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoGradeSubmission } from '@/lib/grading/autoGrading'

// =====================================================
// GET - Get submission detail with questions and answers
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const challengeId = params.id
    const submissionId = params.submissionId
    const supabase = createAdminClient()

    // Get submission with answers
    const { data: submission, error } = await supabase
      .from('challenge_submissions')
      .select(`
        *,
        answers:challenge_answers(
          id,
          question_id,
          answer_text,
          answer_data,
          is_auto_graded,
          auto_score,
          auto_feedback,
          manual_score,
          manual_feedback,
          graded_by,
          graded_at
        )
      `)
      .eq('id', submissionId)
      .eq('challenge_id', challengeId)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check access: users can only view their own submissions
    if (submission.user_id !== user.sub && !['admin', 'manager', 'leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For leaders, check if submission belongs to their team
    if (user.role === 'leader' && submission.user_id !== user.sub) {
      const { data: leaderTeam } = await supabase
        .from('user_team_assignments')
        .select('team_id')
        .eq('user_id', user.sub)
        .eq('role', 'leader')
        .single()

      if (!leaderTeam || leaderTeam.team_id !== submission.user_team_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Get questions for this challenge
    const { data: questions } = await supabase
      .from('challenge_questions')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('display_order', { ascending: true })

    return NextResponse.json({
      status: 'ok',
      submission: {
        ...submission,
        questions: questions || [],
      },
    })
  } catch (error) {
    console.error('[Submission API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - Update submission (save answers or submit)
// =====================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const challengeId = params.id
    const submissionId = params.submissionId
    const supabase = createAdminClient()

    // Get submission
    const { data: submission } = await supabase
      .from('challenge_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('challenge_id', challengeId)
      .single()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Only the submission owner can update it
    if (submission.user_id !== user.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can only update in_progress submissions
    if (submission.status !== 'in_progress') {
      return NextResponse.json({
        error: 'Cannot update submitted submission',
        status: submission.status,
      }, { status: 400 })
    }

    // Check if time has expired
    const now = new Date()
    const startedAt = new Date(submission.started_at)
    const expiresAt = new Date(startedAt.getTime() + submission.duration_minutes * 60 * 1000)

    if (now > expiresAt) {
      // Auto-submit expired submission
      await autoSubmitExpiredSubmission(supabase, challengeId, submissionId)
      return NextResponse.json({
        error: 'Time expired',
        message: 'Your time has run out. Submission has been auto-submitted.',
      }, { status: 400 })
    }

    const body = await request.json()
    const { answers, submit } = body

    if (submit) {
      // Final submission
      return await handleSubmitSubmission(supabase, challengeId, submissionId, answers, now, startedAt)
    } else {
      // Save draft answers
      return await handleSaveDraftAnswers(supabase, submissionId, answers)
    }
  } catch (error) {
    console.error('[Submission API] Error in PUT:', error)
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
 * Save draft answers (not submitting yet)
 */
async function handleSaveDraftAnswers(
  supabase: any,
  submissionId: string,
  answers: Array<{ question_id: string; answer_text?: string; answer_data?: any }>
) {
  // Upsert answers
  for (const answer of answers) {
    const { error } = await supabase
      .from('challenge_answers')
      .upsert(
        {
          submission_id: submissionId,
          question_id: answer.question_id,
          answer_text: answer.answer_text || null,
          answer_data: answer.answer_data || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'submission_id,question_id',
        }
      )

    if (error) {
      console.error('[Submission API] Error saving answer:', error)
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Answers saved',
  })
}

/**
 * Handle final submission with auto-grading
 */
async function handleSubmitSubmission(
  supabase: any,
  challengeId: string,
  submissionId: string,
  answers: Array<{ question_id: string; answer_text?: string; answer_data?: any }>,
  now: Date,
  startedAt: Date
) {
  // Save all answers first
  for (const answer of answers) {
    await supabase
      .from('challenge_answers')
      .upsert(
        {
          submission_id: submissionId,
          question_id: answer.question_id,
          answer_text: answer.answer_text || null,
          answer_data: answer.answer_data || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'submission_id,question_id',
        }
      )
  }

  // Get all questions and answers for auto-grading
  const { data: questions } = await supabase
    .from('challenge_questions')
    .select('*')
    .eq('challenge_id', challengeId)

  const { data: savedAnswers } = await supabase
    .from('challenge_answers')
    .select('*')
    .eq('submission_id', submissionId)

  if (questions && savedAnswers) {
    // Run auto-grading for cloze and drag-drop questions
    const autoGradeResult = await autoGradeSubmission(questions, savedAnswers)

    // Update auto-graded answers
    for (const result of autoGradeResult.results) {
      if (result.question_type !== 'essay') {
        await supabase
          .from('challenge_answers')
          .update({
            is_auto_graded: true,
            auto_score: result.result.score,
            auto_feedback: result.result.feedback,
          })
          .eq('id', result.answer_id)
      }
    }

    // Calculate time spent
    const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

    // Check if there are essay questions that need manual grading
    const hasEssayQuestions = questions.some((q: any) => q.question_type === 'essay')
    const submissionStatus = hasEssayQuestions ? 'submitted' : 'graded'

    // Update submission
    const { data: updatedSubmission } = await supabase
      .from('challenge_submissions')
      .update({
        submitted_at: now.toISOString(),
        time_spent_seconds: timeSpentSeconds,
        auto_score: autoGradeResult.total_auto_score,
        auto_score_max: autoGradeResult.total_auto_max_score,
        final_score: hasEssayQuestions ? null : autoGradeResult.total_auto_score,
        final_score_max: hasEssayQuestions ? null : autoGradeResult.total_auto_max_score,
        status: submissionStatus,
        updated_at: now.toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single()

    return NextResponse.json({
      status: 'ok',
      submission: updatedSubmission,
      auto_graded: autoGradeResult.results.length,
      needs_manual_grading: hasEssayQuestions,
    })
  }

  // Fallback if questions/answers not found
  const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

  const { data: finalSubmission } = await supabase
    .from('challenge_submissions')
    .update({
      submitted_at: now.toISOString(),
      time_spent_seconds: timeSpentSeconds,
      status: 'submitted',
      updated_at: now.toISOString(),
    })
    .eq('id', submissionId)
    .select()
    .single()

  return NextResponse.json({
    status: 'ok',
    submission: finalSubmission,
  })
}

/**
 * Auto-submit an expired submission
 */
async function autoSubmitExpiredSubmission(
  supabase: any,
  challengeId: string,
  submissionId: string
) {
  const now = new Date()

  // Get submission to calculate time spent
  const { data: submission } = await supabase
    .from('challenge_submissions')
    .select('started_at')
    .eq('id', submissionId)
    .single()

  if (!submission) return

  const startedAt = new Date(submission.started_at)
  const timeSpentSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000)

  // Get all questions and answers for auto-grading
  const { data: questions } = await supabase
    .from('challenge_questions')
    .select('*')
    .eq('challenge_id', challengeId)

  const { data: savedAnswers } = await supabase
    .from('challenge_answers')
    .select('*')
    .eq('submission_id', submissionId)

  let autoScore = 0
  let autoScoreMax = 0
  const hasEssayQuestions = questions?.some((q: any) => q.question_type === 'essay')

  if (questions && savedAnswers) {
    const autoGradeResult = await autoGradeSubmission(questions, savedAnswers)

    // Update auto-graded answers
    for (const result of autoGradeResult.results) {
      if (result.question_type !== 'essay') {
        await supabase
          .from('challenge_answers')
          .update({
            is_auto_graded: true,
            auto_score: result.result.score,
            auto_feedback: result.result.feedback,
          })
          .eq('id', result.answer_id)
      }
    }

    autoScore = autoGradeResult.total_auto_score
    autoScoreMax = autoGradeResult.total_auto_max_score
  }

  // Update submission
  await supabase
    .from('challenge_submissions')
    .update({
      submitted_at: now.toISOString(),
      time_spent_seconds: timeSpentSeconds,
      auto_score: autoScore,
      auto_score_max: autoScoreMax,
      final_score: hasEssayQuestions ? null : autoScore,
      final_score_max: hasEssayQuestions ? null : autoScoreMax,
      status: hasEssayQuestions ? 'submitted' : 'graded',
      updated_at: now.toISOString(),
    })
    .eq('id', submissionId)
}
