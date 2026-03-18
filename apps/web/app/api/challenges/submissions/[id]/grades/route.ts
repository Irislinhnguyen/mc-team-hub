/**
 * Edit Grades API - Manager edits grades on submission
 * Endpoint: PATCH (edit grades)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isAdminOrManager } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'

// =====================================================
// PATCH - Edit grades on submission
// =====================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can edit grades
    if (!isAdminOrManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const paramsResolved = await params
    const submissionId = paramsResolved.id
    const supabase = createAdminClient()

    console.log(`[Edit Grades] User ${user.sub} attempting to edit grades for submission ${submissionId}`)

    // Parse request body
    const body = await request.json()
    const { answers } = body

    if (!Array.isArray(answers)) {
      return NextResponse.json({
        error: 'Invalid request',
        details: { answers: ['Must be an array'] },
      }, { status: 400 })
    }

    // Validate submission exists
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      console.error(`[Edit Grades] Submission not found: ${submissionId}`, submissionError)
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Update each answer
    const now = new Date().toISOString()
    let updatedCount = 0
    const updatePromises: Promise<any>[] = []

    for (const answer of answers) {
      const { answerId, score, feedback } = answer

      if (!answerId) {
        console.error(`[Edit Grades] Missing answerId in request`)
        continue
      }

      // Build update object - only include provided fields
      const updateData: any = {
        grading_modified_by: user.sub,
        grading_modified_at: now,
      }

      if (typeof score === 'number') {
        updateData.manual_score = score
      }

      if (typeof feedback === 'string') {
        updateData.manual_feedback = feedback
      }

      // Skip if no changes to make
      if (updateData.manual_score === undefined && updateData.manual_feedback === undefined) {
        continue
      }

      // Update answer
      const updatePromise = supabase
        .from('challenge_answers')
        .update(updateData)
        .eq('id', answerId)
        .eq('submission_id', submissionId)
        .then(({ error }) => {
          if (error) {
            console.error(`[Edit Grades] Error updating answer ${answerId}:`, error)
          } else {
            updatedCount++
          }
          return { error, answerId }
        })

      updatePromises.push(updatePromise)
    }

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises)

    // Check if any updates succeeded
    if (updatedCount === 0) {
      return NextResponse.json({
        error: 'No answers were updated',
        details: 'Check that answerIds are valid and belong to this submission',
      }, { status: 400 })
    }

    // Optionally create audit record for grade edit
    // Only create if at least one grade was changed
    if (updatedCount > 0 && submission) {
      try {
        await supabase
          .from('approvals')
          .insert({
            submission_id: submissionId,
            user_id: user.sub,
            user_role: user.role as 'manager' | 'admin',
            action: 'approved', // Using 'approved' to indicate Manager modification
            from_status: submission.status,
            to_status: submission.status, // No status change, just data change
            notes: `Edited ${updatedCount} answer(s)`,
            created_at: now,
          })
        console.log(`[Edit Grades] Audit record created for ${updatedCount} edits`)
      } catch (auditError) {
        console.error(`[Edit Grades] Error creating audit record:`, auditError)
        // Don't fail request - grades were updated
      }
    }

    // Per plan decision: Do NOT notify Leader on every edit to avoid spam
    // Leader will be notified when Manager explicitly approves

    console.log(`[Edit Grades] Successfully updated ${updatedCount} answers for submission ${submissionId}`)

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      submissionId,
    })
  } catch (error) {
    console.error('[Edit Grades] Error in PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
