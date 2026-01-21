/**
 * Leaderboard API - Challenge Results & Rankings
 * Endpoints: GET (leaderboard)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, isAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

// =====================================================
// GET - Get challenge leaderboard
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const challengeId = params.id
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const teamFilter = searchParams.get('team')

    // Get challenge details
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, name, status, leaderboard_published_at')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check if leaderboard can be viewed
    // Admin/Manager can always view, others only when published
    const canView =
      isAdminOrManager(user) || challenge.leaderboard_published_at !== null

    if (!canView) {
      return NextResponse.json({
        error: 'Leaderboard not available',
        message: 'Leaderboard will be available after results are published',
      }, { status: 403 })
    }

    // Get published submissions (status = 'published' or completed challenges)
    let query = supabase
      .from('challenge_submissions')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq('challenge_id', challengeId)
      .in('status', ['published', 'graded'])
      .not('final_score', 'is', null)
      .order('final_score', { ascending: false })

    // Apply team filter if specified
    if (teamFilter) {
      query = query.eq('user_team_id', teamFilter)
    }

    const { data: submissions, error } = await query

    if (error) {
      console.error('[Leaderboard API] Error fetching submissions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format leaderboard entries
    const entries = (submissions || []).map((sub: any, index: number) => {
      const maxScore = sub.final_score_max || 1
      const percentage = maxScore > 0 ? (sub.final_score / maxScore) * 100 : 0

      return {
        rank: index + 1,
        user_id: sub.user_id,
        user_name: sub.user?.name || 'Unknown',
        user_email: sub.user?.email,
        team_id: sub.user_team_id,
        score: sub.final_score,
        max_score: maxScore,
        percentage: Math.round(percentage * 100) / 100,
        time_spent_seconds: sub.time_spent_seconds,
        submitted_at: sub.submitted_at,
        is_current_user: sub.user_id === user.sub,
      }
    })

    // Find current user's rank
    let userRank: number | undefined
    if (!isAdminOrManager(user)) {
      const userEntry = entries.find((e) => e.is_current_user)
      userRank = userEntry?.rank
    }

    // Get unique teams for filtering
    const uniqueTeams = new Set(
      (submissions || [])
        .map((s: any) => s.user_team_id)
        .filter(Boolean)
    )

    return NextResponse.json({
      status: 'ok',
      challenge_id: challengeId,
      challenge_name: challenge.name,
      entries,
      total_participants: entries.length,
      user_rank: userRank,
      available_teams: Array.from(uniqueTeams),
    })
  } catch (error) {
    console.error('[Leaderboard API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
