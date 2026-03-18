/**
 * Pending Approvals API - Manager/Admin list pending approvals
 * Endpoint: GET /api/approvals/pending
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isAdminOrManager } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin or Manager can view pending approvals
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters for filtering
    const challengeId = searchParams.get('challengeId')
    const teamId = searchParams.get('teamId')
    const leaderId = searchParams.get('leaderId')

    console.log('[Pending Approvals] Fetching pending submissions', {
      userId: user.sub,
      filters: { challengeId, teamId, leaderId }
    })

    // Build the base query with joins
    let query = supabase
      .from('challenge_submissions')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        challenge_id,
        user_id,
        submitted_at,
        final_score,
        final_score_max,
        challenges!inner(id, name),
        users!inner(id, name, email),
        user_team_assignments!inner(team_id)
      `)
      .eq('status', 'pending_review')
      .order('updated_at', { ascending: false })

    // Apply optional filters
    if (challengeId) {
      query = query.eq('challenge_id', challengeId)
    }

    if (teamId) {
      query = query.filter('user_team_assignments', 'team_id', 'eq', teamId)
    }

    // For leader filter, we need to check who submitted for review
    // This requires a separate query to the approvals table
    let leaderSubmissionIds: string[] = []
    if (leaderId) {
      const { data: leaderApprovals } = await supabase
        .from('approvals')
        .select('submission_id')
        .eq('user_id', leaderId)
        .eq('action', 'submitted_for_review')

      if (leaderApprovals) {
        leaderSubmissionIds = leaderApprovals.map(a => a.submission_id)
        if (leaderSubmissionIds.length > 0) {
          query = query.in('id', leaderSubmissionIds)
        } else {
          // No submissions by this leader
          return NextResponse.json({
            submissions: [],
            total: 0,
            filters: { challengeId, teamId, leaderId }
          })
        }
      }
    }

    const { data: submissions, error, count } = await query

    if (error) {
      console.error('[Pending Approvals] Error fetching submissions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format the response data
    const formattedSubmissions = (submissions || []).map((submission: any) => ({
      id: submission.id,
      challenge_id: submission.challenge_id,
      challenge_name: submission.challenges?.name || 'Unknown Challenge',
      user_id: submission.user_id,
      user_name: submission.users?.name || 'Unknown User',
      user_email: submission.users?.email || '',
      team_id: submission.user_team_assignments?.team_id || null,
      status: submission.status,
      final_score: submission.final_score,
      final_score_max: submission.final_score_max,
      submitted_at: submission.submitted_at,
      created_at: submission.created_at,
      updated_at: submission.updated_at
    }))

    console.log('[Pending Approvals] Success:', {
      total: formattedSubmissions.length,
      filters: { challengeId, teamId, leaderId }
    })

    return NextResponse.json({
      submissions: formattedSubmissions,
      total: formattedSubmissions.length,
      filters: { challengeId, teamId, leaderId }
    })
  } catch (error) {
    console.error('[Pending Approvals] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
