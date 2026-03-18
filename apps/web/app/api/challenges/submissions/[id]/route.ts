/**
 * Submission Detail API - Get submission details for Manager approval
 * Endpoint: GET /api/challenges/submissions/{id}
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

    // Only Admin/Manager can view submission details
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const paramsResolved = await params;
    const submissionId = paramsResolved.id;
    const supabase = createAdminClient();

    console.log('[Submission Detail] Fetching submission details', {
      submissionId,
      userId: user.sub,
    });

    // Get submission with challenge and user details
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select(`
        id,
        challenge_id,
        user_id,
        status,
        submitted_at,
        created_at,
        updated_at,
        auto_score,
        auto_score_max,
        final_score,
        final_score_max,
        graded_by,
        graded_at,
        challenges!inner(id, name),
        users!inner(id, name, email),
        user_team_assignments!inner(team_id)
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('[Submission Detail] Submission not found:', submissionId);
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Format the response
    const formattedSubmission = {
      id: submission.id,
      challenge_id: submission.challenge_id,
      challenge_name: submission.challenges?.name || 'Unknown Challenge',
      user_id: submission.user_id,
      user_name: submission.users?.name || 'Unknown User',
      user_email: submission.users?.email || '',
      user_team_id: submission.user_team_assignments?.team_id || null,
      status: submission.status,
      submitted_at: submission.submitted_at,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      auto_score: submission.auto_score,
      auto_score_max: submission.auto_score_max,
      final_score: submission.final_score,
      final_score_max: submission.final_score_max,
      graded_by: submission.graded_by,
      graded_at: submission.graded_at,
    };

    return NextResponse.json({
      submission: formattedSubmission,
    });
  } catch (error) {
    console.error('[Submission Detail] Error in GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
