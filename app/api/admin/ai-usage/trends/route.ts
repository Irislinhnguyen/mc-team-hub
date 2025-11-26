/**
 * API Route: Admin AI Usage Trends
 * GET /api/admin/ai-usage/trends
 *
 * Returns daily cost and usage trends for charting:
 * - Daily costs over last 30 days (or custom range)
 * - Supports groupBy: day, week, month
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
    const days = parseInt(searchParams.get('days') || '30', 10)
    const groupBy = searchParams.get('groupBy') || 'day' // day, week, month

    const supabase = createAdminClient()

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Query raw data
    const { data: logs, error } = await supabase
      .from('openai_usage_logs')
      .select('created_at, total_tokens, total_cost, response_status')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[AI Usage Trends] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch trends data' }, { status: 500 })
    }

    // Group data by date
    const groupedData = new Map<string, {
      date: string
      totalCalls: number
      successfulCalls: number
      failedCalls: number
      totalTokens: number
      totalCost: number
    }>()

    logs?.forEach(log => {
      const date = new Date(log.created_at)
      let key: string

      switch (groupBy) {
        case 'week': {
          // Get ISO week start (Monday)
          const weekStart = new Date(date)
          const day = weekStart.getDay()
          const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
          weekStart.setDate(diff)
          key = weekStart.toISOString().split('T')[0]
          break
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
          break
        default: // day
          key = date.toISOString().split('T')[0]
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          date: key,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
        })
      }

      const group = groupedData.get(key)!
      group.totalCalls++
      if (log.response_status === 'success') {
        group.successfulCalls++
      } else {
        group.failedCalls++
      }
      group.totalTokens += log.total_tokens || 0
      group.totalCost += parseFloat(log.total_cost || '0')
    })

    // Convert to array and format costs
    const trends = Array.from(groupedData.values()).map(g => ({
      ...g,
      totalCost: parseFloat(g.totalCost.toFixed(4)),
    }))

    return NextResponse.json({
      trends,
      period: { days, groupBy },
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[AI Usage Trends] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage trends' },
      { status: 500 }
    )
  }
}
