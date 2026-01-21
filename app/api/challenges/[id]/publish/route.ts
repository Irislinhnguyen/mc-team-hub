/**
 * Publish API - Publish Leaderboard / Complete Challenge
 * Endpoint: POST (publish/unpublish leaderboard)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
      // Check if all submissions are graded before publishing
      const { data: ungradedSubmissions } = await supabase
        .from('challenge_submissions')
        .select('id')
        .eq('challenge_id', challengeId)
        .in('status', ['in_progress', 'submitted'])

      if (ungradedSubmissions && ungradedSubmissions.length > 0) {
        return NextResponse.json({
          error: 'Cannot publish leaderboard',
          message: `${ungradedSubmissions.length} submission(s) still need grading`,
        }, { status: 400 })
      }

      // Update challenge to completed and publish leaderboard
      const { data: updatedChallenge, error } = await supabase
        .from('challenges')
        .update({
          status: 'completed',
          leaderboard_published_at: now,
          leaderboard_published_by: user.sub,
          updated_by: user.sub,
          updated_at: now,
        })
        .eq('id', challengeId)
        .select()
        .single()

      if (error) {
        console.error('[Publish API] Error publishing leaderboard:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Mark all submissions as published
      await supabase
        .from('challenge_submissions')
        .update({
          status: 'published',
          updated_at: now,
        })
        .eq('challenge_id', challengeId)
        .eq('status', 'graded')

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
          updated_by: user.sub,
          updated_at: now,
        })
        .eq('id', challengeId)
        .select()
        .single()

      if (error) {
        console.error('[Publish API] Error unpublishing leaderboard:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Mark all published submissions back to graded
      await supabase
        .from('challenge_submissions')
        .update({
          status: 'graded',
          updated_at: now,
        })
        .eq('challenge_id', challengeId)
        .eq('status', 'published')

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
