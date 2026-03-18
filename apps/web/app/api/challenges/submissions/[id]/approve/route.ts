/**
 * Approve Submission API - Manager approves submission for publishing
 * Endpoint: POST (approve submission)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isAdminOrManager } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'
import { notifyLeadersGradeApproved } from '@/lib/services/workflowNotificationService'

// =====================================================
// POST - Approve submission for publishing
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can approve submissions
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const paramsResolved = await params
    const submissionId = paramsResolved.id
    const supabase = createAdminClient()

    console.log(`[Approve Submission] User ${user.sub} attempting to approve submission ${submissionId}`)

    // Validate current submission state
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select('id, status, challenge_id, user_id, created_at')
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      console.error(`[Approve Submission] Submission not found: ${submissionId}`, submissionError)
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'pending_review') {
      console.error(`[Approve Submission] Invalid state transition: ${submission.status}`)
      return NextResponse.json({
        error: 'Invalid state transition',
        message: 'Submission is not pending review'
      }, { status: 400 })
    }

    // Find the Leader who submitted for review
    const { data: submitReviewApproval, error: approvalError } = await supabase
      .from('approvals')
      .select('user_id')
      .eq('submission_id', submissionId)
      .eq('action', 'submitted_for_review')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (approvalError) {
      console.error(`[Approve Submission] Error finding submit review approval:`, approvalError)
      // Continue anyway - notification will go to all Leaders
    }

    // Update submission status to approved
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('challenge_submissions')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .eq('status', 'pending_review')
      .select('id, status, challenge_id')
      .single()

    if (updateError || !updatedSubmission) {
      console.error(`[Approve Submission] Error updating submission:`, updateError)
      return NextResponse.json({
        error: 'Failed to update submission',
        details: updateError?.message
      }, { status: 500 })
    }

    // Create approval audit record
    const { error: auditError } = await supabase
      .from('approvals')
      .insert({
        submission_id: submissionId,
        user_id: user.sub,
        user_role: user.role as 'manager' | 'admin',
        action: 'approved',
        from_status: 'pending_review',
        to_status: 'approved',
        created_at: new Date().toISOString(),
      })

    if (auditError) {
      console.error(`[Approve Submission] Error creating audit record:`, auditError)
      // Don't fail request - submission was approved
    }

    // Query challenge for notification
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, name')
      .eq('id', submission.challenge_id)
      .single()

    if (challengeError || !challenge) {
      console.error(`[Approve Submission] Error fetching challenge:`, challengeError)
      // Don't fail request - submission was approved
    }

    // Trigger notification to Leader(s)
    if (challenge) {
      try {
        await notifyLeadersGradeApproved(
          challenge.id,
          challenge.name,
          true,
          undefined
        )
        console.log(`[Approve Submission] Notification sent for challenge ${challenge.id}`)
      } catch (notificationError) {
        console.error(`[Approve Submission] Failed to send notification:`, notificationError)
        // Don't fail request - submission was approved
      }
    }

    const approvedAt = new Date().toISOString()

    return NextResponse.json({
      success: true,
      submissionId,
      status: 'approved',
      approvedAt,
    })
  } catch (error) {
    console.error('[Approve Submission] Error in POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
