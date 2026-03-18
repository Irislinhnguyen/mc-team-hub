/**
 * Submit for Review API - Leader submits graded submission for Manager review
 * Endpoint: POST /api/challenges/submissions/{id}/submit-for-review
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isLeaderOrAbove } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'
import { notifyManagersGradesSubmitted } from '@/lib/services/workflowNotificationService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Leader or above can submit for review
    if (!isLeaderOrAbove(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { id: submissionId } = await params

    // Validate current submission state
    const { data: submission, error: fetchError } = await supabase
      .from('challenge_submissions')
      .select('id, status, challenge_id')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      console.error('[Submit for Review] Submission not found:', submissionId, fetchError)
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check if submission is in correct state (grading -> pending_review)
    if (submission.status !== 'grading') {
      console.error('[Submit for Review] Invalid state transition:', {
        submissionId,
        currentStatus: submission.status,
        expectedStatus: 'grading'
      })
      return NextResponse.json({
        error: 'Invalid state transition',
        details: `Cannot submit submission with status '${submission.status}' for review. Must be in 'grading' status.`
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Update submission status to pending_review
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('challenge_submissions')
      .update({
        status: 'pending_review',
        updated_at: now
      })
      .eq('id', submissionId)
      .eq('status', 'grading') // Only update if still in grading state (concurrent check)
      .select('id, status, challenge_id')
      .single()

    if (updateError) {
      console.error('[Submit for Review] Error updating submission:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updatedSubmission) {
      console.error('[Submit for Review] No rows updated, state may have changed:', submissionId)
      return NextResponse.json({
        error: 'Invalid state transition',
        details: 'Submission state changed concurrently. Please refresh and try again.'
      }, { status: 400 })
    }

    // Create approval audit record
    const { data: approval, error: approvalError } = await supabase
      .from('approvals')
      .insert({
        submission_id: submissionId,
        user_id: user.sub,
        user_role: user.role as 'leader' | 'manager' | 'admin',
        action: 'submitted_for_review',
        from_status: 'grading',
        to_status: 'pending_review',
        created_at: now
      })
      .select('id, created_at')
      .single()

    if (approvalError) {
      console.error('[Submit for Review] Error creating approval record:', approvalError)
      // Don't fail request if approval record fails - submission is already updated
    } else {
      console.log('[Submit for Review] Approval record created:', approval?.id)
    }

    // Query challenge for notification
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, name')
      .eq('id', submission.challenge_id)
      .single()

    // Trigger notification to Managers (async, non-blocking)
    if (challenge) {
      notifyManagersGradesSubmitted(
        challenge.id,
        challenge.name,
        user.name || 'A Leader',
        1
      ).catch((error) => {
        console.error('[Submit for Review] Failed to send notification:', error)
      })
    }

    console.log('[Submit for Review] Success:', {
      submissionId,
      status: 'pending_review',
      userId: user.sub,
      approvalId: approval?.id
    })

    return NextResponse.json({
      success: true,
      submissionId,
      status: 'pending_review',
      approvalId: approval?.id,
      message: 'Submission submitted for Manager review'
    })
  } catch (error) {
    console.error('[Submit for Review] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
