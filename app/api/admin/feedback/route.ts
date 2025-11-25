import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    requireAdminOrManager(user)

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const type = searchParams.get('type') // positive, negative, error, or null for all
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('query_feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply type filter if provided
    if (type && ['positive', 'negative', 'error'].includes(type)) {
      query = query.eq('feedback_type', type)
    }

    const { data: feedbacks, error, count } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    // Get user info for each feedback
    const userIds = [...new Set(feedbacks?.map(f => f.user_id).filter(Boolean))]
    let usersMap: Record<string, { name: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds)

      if (users) {
        usersMap = users.reduce((acc, u) => {
          acc[u.id] = { name: u.name || 'Unknown', email: u.email }
          return acc
        }, {} as Record<string, { name: string; email: string }>)
      }
    }

    // Enrich feedback with user info
    const enrichedFeedbacks = feedbacks?.map(f => ({
      ...f,
      user_name: f.user_id ? usersMap[f.user_id]?.name || 'Unknown' : 'Anonymous',
      user_email: f.user_id ? usersMap[f.user_id]?.email || '' : '',
    }))

    return NextResponse.json({
      feedbacks: enrichedFeedbacks || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error: any) {
    console.error('Admin feedback error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    )
  }
}
