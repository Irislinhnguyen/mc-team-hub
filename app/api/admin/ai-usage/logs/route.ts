/**
 * API Route: Admin AI Usage Logs
 * GET /api/admin/ai-usage/logs
 *
 * Returns paginated list of OpenAI API calls:
 * - Supports filtering by user, feature, model, date range
 * - Supports pagination
 * - Shows detailed log entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest, isAdmin, isManager } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or manager
    if (!isAdmin(user) && !isManager(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const userId = searchParams.get('userId')
    const feature = searchParams.get('feature')
    const model = searchParams.get('model')
    const status = searchParams.get('status')
    const days = parseInt(searchParams.get('days') || '7', 10)

    const supabase = createAdminClient()

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build query
    let query = supabase
      .from('openai_usage_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (feature) {
      query = query.eq('feature', feature)
    }
    if (model) {
      query = query.eq('model', model)
    }
    if (status) {
      query = query.eq('response_status', status)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('[AI Usage Logs] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    // Format logs
    const formattedLogs = logs?.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      user: {
        id: log.user_id,
        email: log.user_email,
        role: log.user_role,
      },
      endpoint: log.endpoint,
      feature: log.feature,
      model: log.model,
      tokens: {
        prompt: log.prompt_tokens,
        completion: log.completion_tokens,
        total: log.total_tokens,
      },
      cost: {
        input: parseFloat(log.input_cost || '0'),
        output: parseFloat(log.output_cost || '0'),
        total: parseFloat(log.total_cost || '0'),
      },
      requestSummary: log.request_summary,
      status: log.response_status,
      errorMessage: log.error_message,
      executionTimeMs: log.execution_time_ms,
    }))

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      filters: { userId, feature, model, status, days },
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[AI Usage Logs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage logs' },
      { status: 500 }
    )
  }
}
