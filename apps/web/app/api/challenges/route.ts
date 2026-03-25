/**
 * Challenges API - Main CRUD
 * Endpoints: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'
import type {
  CreateChallengeRequest,
  Challenge,
  ChallengeStatus,
} from '@query-stream-ai/types/challenge'
import { z } from 'zod'

// =====================================================
// Timezone Helpers
// =====================================================

/**
 * Convert datetime-local input (user's local time) to UTC ISO string for storage
 * HTML5 datetime-local returns "2025-03-25T14:30" which is in user's local timezone
 * We convert to UTC for consistent database storage
 *
 * Input: "2025-03-25T14:30" (user's local time, e.g., Vietnam GMT+7)
 * Output: "2025-03-25T07:30:00.000Z" (UTC equivalent)
 */
function toUTCISO(localDatetime: string): string {
  // datetime-local format: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  const [datePart, timePart = '00:00'] = localDatetime.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second = 0] = timePart.split(':').map(Number)

  // Create date object treating the input as local time
  const localDate = new Date(year, month - 1, day, hour, minute, second)

  // Return UTC ISO string
  return localDate.toISOString()
}

// =====================================================
// Validation Schema
// =====================================================

const createChallengeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  description: z.string().max(2000).optional().nullable(),
  open_date: z.string().datetime('Invalid open_date format'),
  close_date: z.string().datetime('Invalid close_date format'),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours'),
  max_attempts: z.number().min(1, 'At least 1 attempt required').max(10, 'Cannot exceed 10 attempts').default(1),
})

// =====================================================
// GET - List all challenges
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const statusParam = searchParams.get('status')
    const statuses = statusParam ? statusParam.split(',') : []

    // Build query - explicitly select columns to avoid foreign key issues
    let query = supabase
      .from('challenges')
      .select('id, name, description, open_date, close_date, duration_minutes, max_attempts, status, leaderboard_published_at, leaderboard_published_by, created_by, updated_by, created_at, updated_at')
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (statuses.length > 0) {
      query = query.in('status', statuses as ChallengeStatus[])
    } else {
      // Non-admins only see non-draft challenges
      if (!['admin', 'manager'].includes(user.role)) {
        query = query.in('status', ['open', 'closed', 'grading', 'completed'])
      }
    }

    const { data: challenges, error } = await query

    if (error) {
      console.error('[Challenges API] Error fetching challenges:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch question counts separately
    const challengeIds = (challenges || []).map((c: any) => c.id)
    let questionCountMap: Record<string, number> = {}

    if (challengeIds.length > 0) {
      // Use RPC to count questions per challenge efficiently
      const { data: questionCounts, error: countError } = await supabase
        .from('challenge_questions')
        .select('challenge_id')

      if (!countError && questionCounts) {
        questionCounts.forEach((qc: any) => {
          questionCountMap[qc.challenge_id] = (questionCountMap[qc.challenge_id] || 0) + 1
        })
      }
    }

    // Fetch creator names separately
    const creatorIds = [...new Set((challenges || []).map((c: any) => c.created_by))]
    const creatorNameMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, name')
        .in('id', creatorIds)

      creators?.forEach((creator: any) => {
        creatorNameMap[creator.id] = creator.name
      })
    }

    // Format response
    const formattedChallenges: Challenge[] = (challenges || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      open_date: c.open_date,
      close_date: c.close_date,
      duration_minutes: c.duration_minutes,
      max_attempts: c.max_attempts,
      status: c.status,
      leaderboard_published_at: c.leaderboard_published_at,
      leaderboard_published_by: c.leaderboard_published_by,
      created_by: c.created_by,
      updated_by: c.updated_by,
      created_at: c.created_at,
      updated_at: c.updated_at,
      question_count: questionCountMap[c.id] || 0,
      creator_name: creatorNameMap[c.created_by],
    }))

    return NextResponse.json({
      status: 'ok',
      challenges: formattedChallenges,
    })
  } catch (error) {
    console.error('[Challenges API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Create new challenge
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can create challenges
    requireAdminOrManager(user)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createChallengeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data

    // Convert datetime-local input to UTC for storage
    const openDateUTC = toUTCISO(data.open_date)
    const closeDateUTC = toUTCISO(data.close_date)

    // Validate dates (using UTC for comparison)
    const openDate = new Date(openDateUTC)
    const closeDate = new Date(closeDateUTC)
    if (closeDate <= openDate) {
      return NextResponse.json({
        error: 'Validation failed',
        details: { close_date: ['Close date must be after open date'] },
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Create challenge (store dates in UTC)
    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert({
        name: data.name,
        description: data.description || null,
        open_date: openDateUTC,
        close_date: closeDateUTC,
        duration_minutes: data.duration_minutes,
        max_attempts: data.max_attempts,
        status: 'draft',
        created_by: user.sub,
        updated_by: user.sub,
      })
      .select()
      .single()

    if (error) {
      console.error('[Challenges API] Error creating challenge:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      challenge,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Challenges API] Error in POST:', error)

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
