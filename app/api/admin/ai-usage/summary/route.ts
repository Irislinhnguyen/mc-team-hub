/**
 * API Route: Admin AI Usage Summary
 * GET /api/admin/ai-usage/summary
 *
 * Returns summary statistics for OpenAI usage:
 * - Today's usage and cost
 * - This month's usage and cost
 * - All-time totals
 * - Average cost per request
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

    const supabase = createAdminClient()

    // Get date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Query: Today's stats
    const { data: todayStats, error: todayError } = await supabase
      .from('openai_usage_logs')
      .select('total_tokens, total_cost, response_status')
      .gte('created_at', todayStart)

    if (todayError) {
      console.error('[AI Usage Summary] Today stats error:', todayError)
    }

    // Query: This month's stats
    const { data: monthStats, error: monthError } = await supabase
      .from('openai_usage_logs')
      .select('total_tokens, total_cost, response_status')
      .gte('created_at', monthStart)

    if (monthError) {
      console.error('[AI Usage Summary] Month stats error:', monthError)
    }

    // Query: All-time stats
    const { data: allTimeStats, error: allTimeError } = await supabase
      .from('openai_usage_logs')
      .select('total_tokens, total_cost, response_status')

    if (allTimeError) {
      console.error('[AI Usage Summary] All-time stats error:', allTimeError)
    }

    // Calculate summaries
    const calculateSummary = (data: any[] | null) => {
      if (!data || data.length === 0) {
        return {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgCostPerRequest: 0,
        }
      }

      const totalCalls = data.length
      const successfulCalls = data.filter(d => d.response_status === 'success').length
      const failedCalls = totalCalls - successfulCalls
      const totalTokens = data.reduce((sum, d) => sum + (d.total_tokens || 0), 0)
      const totalCost = data.reduce((sum, d) => sum + parseFloat(d.total_cost || 0), 0)
      const avgCostPerRequest = totalCalls > 0 ? totalCost / totalCalls : 0

      return {
        totalCalls,
        successfulCalls,
        failedCalls,
        totalTokens,
        totalCost: parseFloat(totalCost.toFixed(4)),
        avgCostPerRequest: parseFloat(avgCostPerRequest.toFixed(6)),
      }
    }

    const summary = {
      today: calculateSummary(todayStats),
      thisMonth: calculateSummary(monthStats),
      allTime: calculateSummary(allTimeStats),
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('[AI Usage Summary] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage summary' },
      { status: 500 }
    )
  }
}
