/**
 * API Route: Admin AI Usage Top Users
 * GET /api/admin/ai-usage/top-users
 *
 * Returns top users by OpenAI usage/cost:
 * - Ranked by total cost or total calls
 * - Supports date range filtering
 * - Supports pagination
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
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const sortBy = searchParams.get('sortBy') || 'cost' // cost, calls, tokens

    const supabase = createAdminClient()

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Query logs grouped by user
    const { data: logs, error } = await supabase
      .from('openai_usage_logs')
      .select('user_id, user_email, user_role, total_tokens, total_cost, response_status')
      .gte('created_at', startDate.toISOString())

    if (error) {
      console.error('[AI Usage Top Users] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch top users data' }, { status: 500 })
    }

    // Aggregate by user
    const userMap = new Map<string, {
      userId: string
      email: string
      role: string
      totalCalls: number
      successfulCalls: number
      failedCalls: number
      totalTokens: number
      totalCost: number
    }>()

    logs?.forEach(log => {
      const key = log.user_id
      if (!userMap.has(key)) {
        userMap.set(key, {
          userId: log.user_id,
          email: log.user_email,
          role: log.user_role,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
        })
      }

      const userData = userMap.get(key)!
      userData.totalCalls++
      if (log.response_status === 'success') {
        userData.successfulCalls++
      } else {
        userData.failedCalls++
      }
      userData.totalTokens += log.total_tokens || 0
      userData.totalCost += parseFloat(log.total_cost || '0')
    })

    // Convert to array and sort
    let users = Array.from(userMap.values()).map(u => ({
      ...u,
      totalCost: parseFloat(u.totalCost.toFixed(4)),
      avgCostPerCall: u.totalCalls > 0 ? parseFloat((u.totalCost / u.totalCalls).toFixed(6)) : 0,
    }))

    // Sort by specified field
    switch (sortBy) {
      case 'calls':
        users.sort((a, b) => b.totalCalls - a.totalCalls)
        break
      case 'tokens':
        users.sort((a, b) => b.totalTokens - a.totalTokens)
        break
      default: // cost
        users.sort((a, b) => b.totalCost - a.totalCost)
    }

    // Apply limit
    users = users.slice(0, limit)

    // Add rank
    const rankedUsers = users.map((u, index) => ({
      rank: index + 1,
      ...u,
    }))

    return NextResponse.json({
      users: rankedUsers,
      period: { days, sortBy },
      total: userMap.size,
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[AI Usage Top Users] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top users' },
      { status: 500 }
    )
  }
}
