/**
 * Submission Answers API - Get answers for a submission
 * Endpoint: GET /api/challenges/submissions/{id}/answers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, isAdminOrManager } from '@query-stream-ai/auth/server';
import { createAdminClient } from '@query-stream-ai/db/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin/Manager can view submission answers
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const paramsResolved = await params;
    const submissionId = paramsResolved.id;
    const supabase = createAdminClient();

    console.log('[Submission Answers] Fetching answers', {
      submissionId,
      userId: user.sub,
    });

    // Verify submission exists
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select('id, status, challenge_id')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('[Submission Answers] Submission not found:', submissionId);
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Get answers with question details
    const { data: answers, error: answersError } = await supabase
      .from('challenge_answers')
      .select(`
        id,
        question_id,
        answer_text,
        is_auto_graded,
        auto_score,
        auto_score_max,
        manual_score,
        manual_score_max,
        manual_feedback,
        grading_modified_by,
        grading_modified_at,
        challenge_questions!inner(
          id,
          question_text,
          question_type,
          points
        )
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (answersError) {
      console.error('[Submission Answers] Error fetching answers:', answersError);
      return NextResponse.json({ error: answersError.message }, { status: 500 });
    }

    // Format the response
    const formattedAnswers = (answers || []).map((answer: any) => ({
      id: answer.id,
      question_id: answer.question_id,
      question_text: answer.challenge_questions?.question_text || '',
      question_type: answer.challenge_questions?.question_type || 'text',
      user_answer: answer.answer_text || '',
      is_auto_graded: answer.is_auto_graded || false,
      auto_score: answer.auto_score,
      auto_score_max: answer.auto_score_max || answer.challenge_questions?.points,
      manual_score: answer.manual_score,
      manual_score_max: answer.manual_score_max || answer.challenge_questions?.points,
      manual_feedback: answer.manual_feedback,
      grading_modified_by: answer.grading_modified_by,
      grading_modified_at: answer.grading_modified_at,
    }));

    return NextResponse.json({
      answers: formattedAnswers,
      total: formattedAnswers.length,
    });
  } catch (error) {
    console.error('[Submission Answers] Error in GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
