/**
 * Publish API - Publish Leaderboard / Complete Challenge
 * Endpoint: POST (publish/unpublish leaderboard)
 *
 * Approval Workflow Integration:
 * - Only Manager/Admin can publish
 * - Submissions must be in 'approved' status before publishing
 * - Publishing triggers notification to all users
 * - Publish action updates challenge and submission status to 'published'
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'
import { notifyUsersScoresPublished } from '@/lib/services/workflowNotificationService'

// =====================================================
// POST - Publish or unpublish leaderboard
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

    // Only Admin/Manager can publish leaderboard
    requireAdminOrManager(user)

    const challengeId = params.id
    const supabase = createAdminClient()

    // Get user's UUID from database (JWT uses email as sub, but DB needs UUID)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.sub)
      .single()

    const userUuid = userData?.id

    // Get challenge
    const { data: challenge } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    const body = await request.json()
    const { publish = true } = body

    const now = new Date().toISOString()

    if (publish) {
      // Approval Workflow: Check if all submissions are approved before publishing
      const { data: unapprovedSubmissions } = await supabase
        .from('challenge_submissions')
        .select('id, status')
        .eq('challenge_id', challengeId)
        .in('status', ['in_progress', 'submitted', 'grading', 'pending_review'])

      if (unapprovedSubmissions && unapprovedSubmissions.length > 0) {
        const pendingCount = unapprovedSubmissions.filter(s => s.status === 'pending_review').length
        const ungradedCount = unapprovedSubmissions.filter(s =>
          ['in_progress', 'submitted', 'grading'].includes(s.status)
        ).length

        let message = 'Cannot publish leaderboard'
        if (pendingCount > 0) {
          message += `. ${pendingCount} submission(s) pending Manager approval`
        }
        if (ungradedCount > 0) {
          message += `. ${ungradedCount} submission(s) still need grading`
        }

        return NextResponse.json({
          error: 'Cannot publish leaderboard',
          message,
        }, { status: 400 })
      }

      // Update challenge to completed and publish leaderboard
      const { data: updatedChallenge, error } = await supabase
        .from('challenges')
        .update({
          status: 'completed',
          leaderboard_published_at: now,
          leaderboard_published_by: userUuid,
          updated_by: userUuid,
          updated_at: now,
        })
        .eq('id', challengeId)
        .select()
        .single()

      if (error) {
        console.error('[Publish API] Error publishing leaderboard:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Mark all approved submissions as published
      const { error: updateError } = await supabase
        .from('challenge_submissions')
        .update({
          status: 'published',
          updated_at: now,
        })
        .eq('challenge_id', challengeId)
        .eq('status', 'approved')

      if (updateError) {
        console.error('[Publish API] Error updating submission status:', updateError)
        // Don't fail the request if submission update fails, challenge is already published
      }

      // Trigger notification to all users that scores are published
      if (updatedChallenge) {
        notifyUsersScoresPublished(updatedChallenge.id, updatedChallenge.name).catch((error) => {
          console.error('[Publish API] Failed to send notification:', error)
          // Don't fail the request if notification fails
        })
      }

      return NextResponse.json({
        status: 'ok',
        challenge: updatedChallenge,
        message: 'Leaderboard published successfully',
      })
    } else {
      // Unpublish leaderboard (revert to grading status)
      const { data: updatedChallenge, error } = await supabase
        .from('challenges')
        .update({
          status: 'grading',
          leaderboard_published_at: null,
          leaderboard_published_by: null,
          updated_by: userUuid,
          updated_at: now,
        })
        .eq('id', challengeId)
        .select()
        .single()

      if (error) {
        console.error('[Publish API] Error unpublishing leaderboard:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Mark all published submissions back to approved
      const { error: updateError } = await supabase
        .from('challenge_submissions')
        .update({
          status: 'approved',
          updated_at: now,
        })
        .eq('challenge_id', challengeId)
        .eq('status', 'published')

      if (updateError) {
        console.error('[Publish API] Error reverting submission status:', updateError)
        // Don't fail the request if submission update fails
      }

      return NextResponse.json({
        status: 'ok',
        challenge: updatedChallenge,
        message: 'Leaderboard unpublished successfully',
      })
    }
  } catch (error: any) {
    console.error('[Publish API] Error in POST:', error)

    // Handle permission errors
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
