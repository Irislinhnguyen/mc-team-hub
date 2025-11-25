/**
 * API Route: Admin AI Usage Breakdown
 * GET /api/admin/ai-usage/breakdown
 *
 * Returns usage breakdown by different dimensions:
 * - By model (gpt-4o, gpt-4-turbo, etc.)
 * - By feature (sql_generation, query_parsing, etc.)
 * - By user role (admin, manager, user)
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

    const supabase = createAdminClient()

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Query all logs for the period
    const { data: logs, error } = await supabase
      .from('openai_usage_logs')
      .select('model, feature, user_role, total_tokens, total_cost, response_status')
      .gte('created_at', startDate.toISOString())

    if (error) {
      console.error('[AI Usage Breakdown] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch breakdown data' }, { status: 500 })
    }

    // Aggregate by model
    const byModel = new Map<string, { name: string; calls: number; tokens: number; cost: number }>()
    // Aggregate by feature
    const byFeature = new Map<string, { name: string; calls: number; tokens: number; cost: number }>()
    // Aggregate by user role
    const byRole = new Map<string, { name: string; calls: number; tokens: number; cost: number }>()

    logs?.forEach(log => {
      // By model
      const model = log.model || 'unknown'
      if (!byModel.has(model)) {
        byModel.set(model, { name: model, calls: 0, tokens: 0, cost: 0 })
      }
      const modelData = byModel.get(model)!
      modelData.calls++
      modelData.tokens += log.total_tokens || 0
      modelData.cost += parseFloat(log.total_cost || '0')

      // By feature
      const feature = log.feature || 'unknown'
      if (!byFeature.has(feature)) {
        byFeature.set(feature, { name: feature, calls: 0, tokens: 0, cost: 0 })
      }
      const featureData = byFeature.get(feature)!
      featureData.calls++
      featureData.tokens += log.total_tokens || 0
      featureData.cost += parseFloat(log.total_cost || '0')

      // By user role
      const role = log.user_role || 'unknown'
      if (!byRole.has(role)) {
        byRole.set(role, { name: role, calls: 0, tokens: 0, cost: 0 })
      }
      const roleData = byRole.get(role)!
      roleData.calls++
      roleData.tokens += log.total_tokens || 0
      roleData.cost += parseFloat(log.total_cost || '0')
    })

    // Format results with percentage
    const formatBreakdown = (map: Map<string, { name: string; calls: number; tokens: number; cost: number }>) => {
      const totalCost = Array.from(map.values()).reduce((sum, d) => sum + d.cost, 0)
      return Array.from(map.values())
        .map(d => ({
          ...d,
          cost: parseFloat(d.cost.toFixed(4)),
          percentage: totalCost > 0 ? parseFloat(((d.cost / totalCost) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.cost - a.cost)
    }

    return NextResponse.json({
      byModel: formatBreakdown(byModel),
      byFeature: formatBreakdown(byFeature),
      byRole: formatBreakdown(byRole),
      period: { days },
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[AI Usage Breakdown] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage breakdown' },
      { status: 500 }
    )
  }
}
