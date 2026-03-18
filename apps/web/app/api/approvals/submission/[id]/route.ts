/**
 * Approval History API - Manager/Admin view approval history for a submission
 * Endpoint: GET /api/approvals/submission/{id}
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isAdminOrManager } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin or Manager can view approval history
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { id: submissionId } = await params

    console.log('[Approval History] Fetching approval history', {
      submissionId,
      userId: user.sub
    })

    // Verify submission exists
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      console.error('[Approval History] Submission not found:', submissionId)
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Query approval history with user details
    const { data: approvals, error } = await supabase
      .from('approvals')
      .select(`
        id,
        action,
        from_status,
        to_status,
        notes,
        created_at,
        user_id,
        user_role,
        users!inner(id, name, email)
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Approval History] Error fetching approvals:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format the response data
    const formattedApprovals = (approvals || []).map((approval: any) => ({
      id: approval.id,
      action: approval.action,
      from_status: approval.from_status,
      to_status: approval.to_status,
      notes: approval.notes,
      created_at: approval.created_at,
      user_id: approval.user_id,
      user_role: approval.user_role,
      user: {
        id: approval.users?.id,
        name: approval.users?.name || 'Unknown User',
        email: approval.users?.email || ''
      }
    }))

    console.log('[Approval History] Success:', {
      submissionId,
      count: formattedApprovals.length
    })

    return NextResponse.json({
      submissionId,
      submissionStatus: submission.status,
      approvals: formattedApprovals,
      total: formattedApprovals.length
    })
  } catch (error) {
    console.error('[Approval History] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
