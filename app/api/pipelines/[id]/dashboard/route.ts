/**
 * Pipeline Dashboard API
 * GET /api/pipelines/[id]/dashboard - Get aggregated dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'
import type {
  DashboardStats,
  DashboardOverview,
  StatusBreakdown,
  PocPerformance,
  RegionBreakdown,
  ProductBreakdown,
  MonthlyForecast,
  ActionItem,
  TopOpportunity
} from '@/lib/types/dashboard'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pipelineId } = await params

    // Authenticate user
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify pipeline exists
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('id', pipelineId)
      .single()

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    // Optional: filter by POC for team member view
    const poc = request.nextUrl.searchParams.get('poc')

    // Fetch deals with stage information from summary view
    let dealsQuery = supabase
      .from('pipeline_deals_summary')
      .select('*')
      .eq('pipeline_id', pipelineId)

    if (poc) {
      dealsQuery = dealsQuery.eq('poc', poc)
    }

    const { data: deals, error: dealsError } = await dealsQuery

    if (dealsError) {
      console.error('[Dashboard API] Error fetching deals:', dealsError)
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      )
    }

    // Fetch pipeline stages
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!stages) {
      return NextResponse.json(
        { error: 'Failed to fetch pipeline stages' },
        { status: 500 }
      )
    }

    // Calculate overview metrics
    const overview: DashboardOverview = calculateOverview(deals || [], stages)

    // Calculate breakdowns
    const by_status: StatusBreakdown[] = groupByStatus(deals || [], stages)
    const by_poc: PocPerformance[] = groupByPoc(deals || [], stages)
    const by_region: RegionBreakdown[] = groupByRegion(deals || [], stages)
    const by_product: ProductBreakdown[] = groupByProduct(deals || [], stages)

    // Fetch monthly forecasts
    const { data: forecasts } = await supabase
      .from('deal_monthly_forecast')
      .select('year, month, gross_revenue, net_revenue, deal_id')
      .in('deal_id', (deals || []).map(d => d.id))

    const monthly_forecast: MonthlyForecast[] = aggregateForecastsByMonth(
      forecasts || []
    )

    // Get action items (deals with action_date in next 7 days or overdue)
    const action_items: ActionItem[] = getActionItems(deals || [])

    // Get top opportunities (highest value deals)
    const top_opportunities: TopOpportunity[] = getTopOpportunities(deals || [])

    const stats: DashboardStats = {
      overview,
      by_status,
      by_poc,
      by_region,
      by_product,
      monthly_forecast,
      action_items,
      top_opportunities
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[Dashboard API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions

function calculateOverview(deals: any[], stages: any[]): DashboardOverview {
  const total_deals = deals.length
  const total_pipeline_value = deals.reduce(
    (sum, d) => sum + (d.q_gross || 0),
    0
  )

  const weighted_pipeline_value = deals.reduce((sum, deal) => {
    const stage = stages.find(s => s.code === deal.status)
    if (!stage) return sum

    const weight =
      deal.forecast_type === 'estimate'
        ? stage.estimate_percent
        : stage.out_of_estimate_percent

    return sum + (deal.q_gross || 0) * (weight / 100)
  }, 0)

  const avg_deal_size = total_deals > 0 ? total_pipeline_value / total_deals : 0

  // Win rate: percentage of deals in 【S】or 【S-】status
  const wonDeals = deals.filter(
    d => d.status === '【S】' || d.status === '【S-】'
  )
  const win_rate = total_deals > 0 ? (wonDeals.length / total_deals) * 100 : 0

  return {
    total_deals,
    total_pipeline_value,
    weighted_pipeline_value,
    avg_deal_size,
    win_rate
  }
}

function groupByStatus(deals: any[], stages: any[]): StatusBreakdown[] {
  const statusMap = new Map<string, StatusBreakdown>()

  // Initialize with all stages
  stages.forEach(stage => {
    statusMap.set(stage.code, {
      status: stage.code,
      status_name: stage.name,
      status_description: stage.description || '',
      status_color: stage.color,
      count: 0,
      total_value: 0,
      weighted_value: 0,
      estimate_percent: stage.estimate_percent,
      out_of_estimate_percent: stage.out_of_estimate_percent
    })
  })

  // Aggregate deals by status
  deals.forEach(deal => {
    const existing = statusMap.get(deal.status)
    if (existing) {
      existing.count++
      existing.total_value += deal.q_gross || 0

      const weight =
        deal.forecast_type === 'estimate'
          ? existing.estimate_percent
          : existing.out_of_estimate_percent

      existing.weighted_value += (deal.q_gross || 0) * (weight / 100)
    }
  })

  return Array.from(statusMap.values()).filter(s => s.count > 0)
}

function groupByPoc(deals: any[], stages: any[]): PocPerformance[] {
  const pocMap = new Map<string, PocPerformance>()

  deals.forEach(deal => {
    const poc = deal.poc || 'Unknown'
    const existing = pocMap.get(poc)

    const stage = stages.find(s => s.code === deal.status)
    const weight = stage
      ? deal.forecast_type === 'estimate'
        ? stage.estimate_percent
        : stage.out_of_estimate_percent
      : 0

    const weighted_value = (deal.q_gross || 0) * (weight / 100)

    if (existing) {
      existing.count++
      existing.total_value += deal.q_gross || 0
      existing.weighted_value += weighted_value
    } else {
      pocMap.set(poc, {
        poc,
        count: 1,
        total_value: deal.q_gross || 0,
        weighted_value,
        avg_deal_size: 0,
        win_rate: 0
      })
    }
  })

  // Calculate averages and win rates
  const result = Array.from(pocMap.values())
  result.forEach(poc => {
    poc.avg_deal_size = poc.count > 0 ? poc.total_value / poc.count : 0

    const pocDeals = deals.filter(d => (d.poc || 'Unknown') === poc.poc)
    const wonDeals = pocDeals.filter(
      d => d.status === '【S】' || d.status === '【S-】'
    )
    poc.win_rate = pocDeals.length > 0 ? (wonDeals.length / pocDeals.length) * 100 : 0
  })

  return result.sort((a, b) => b.total_value - a.total_value)
}

function groupByRegion(deals: any[], stages: any[]): RegionBreakdown[] {
  const regionMap = new Map<string, RegionBreakdown>()

  deals.forEach(deal => {
    const region = deal.region || 'Unknown'
    const existing = regionMap.get(region)

    const stage = stages.find(s => s.code === deal.status)
    const weight = stage
      ? deal.forecast_type === 'estimate'
        ? stage.estimate_percent
        : stage.out_of_estimate_percent
      : 0

    const weighted_value = (deal.q_gross || 0) * (weight / 100)

    if (existing) {
      existing.count++
      existing.total_value += deal.q_gross || 0
      existing.weighted_value += weighted_value
    } else {
      regionMap.set(region, {
        region,
        count: 1,
        total_value: deal.q_gross || 0,
        weighted_value
      })
    }
  })

  return Array.from(regionMap.values()).sort((a, b) => b.total_value - a.total_value)
}

function groupByProduct(deals: any[], stages: any[]): ProductBreakdown[] {
  const productMap = new Map<string, ProductBreakdown>()

  deals.forEach(deal => {
    const product = deal.product || 'Unknown'
    const existing = productMap.get(product)

    const stage = stages.find(s => s.code === deal.status)
    const weight = stage
      ? deal.forecast_type === 'estimate'
        ? stage.estimate_percent
        : stage.out_of_estimate_percent
      : 0

    const weighted_value = (deal.q_gross || 0) * (weight / 100)

    if (existing) {
      existing.count++
      existing.total_value += deal.q_gross || 0
      existing.weighted_value += weighted_value
    } else {
      productMap.set(product, {
        product,
        count: 1,
        total_value: deal.q_gross || 0,
        weighted_value
      })
    }
  })

  return Array.from(productMap.values()).sort((a, b) => b.total_value - a.total_value)
}

function aggregateForecastsByMonth(forecasts: any[]): MonthlyForecast[] {
  const monthMap = new Map<string, MonthlyForecast>()

  forecasts.forEach(forecast => {
    const key = `${forecast.year}-${forecast.month}`
    const existing = monthMap.get(key)

    if (existing) {
      existing.gross_revenue += forecast.gross_revenue || 0
      existing.net_revenue += forecast.net_revenue || 0
      existing.deal_count++
    } else {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ]
      const month_label = `${monthNames[forecast.month - 1]} ${forecast.year}`

      monthMap.set(key, {
        year: forecast.year,
        month: forecast.month,
        month_label,
        gross_revenue: forecast.gross_revenue || 0,
        net_revenue: forecast.net_revenue || 0,
        deal_count: 1
      })
    }
  })

  return Array.from(monthMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
}

function getActionItems(deals: any[]): ActionItem[] {
  const now = new Date()
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const items = deals
    .filter(d => d.action_date)
    .map(deal => {
      const actionDate = new Date(deal.action_date)
      const diffTime = actionDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        id: deal.id,
        publisher: deal.publisher,
        poc: deal.poc,
        status: deal.status,
        status_color: deal.status_color || '#6B7280',
        action_date: deal.action_date,
        next_action: deal.next_action,
        action_detail: deal.action_detail,
        q_gross: deal.q_gross,
        days_until_action: diffDays
      }
    })
    .filter(item => item.days_until_action <= 7)
    .sort((a, b) => a.days_until_action - b.days_until_action)

  return items.slice(0, 20) // Limit to 20 items
}

function getTopOpportunities(deals: any[]): TopOpportunity[] {
  return deals
    .map(deal => ({
      id: deal.id,
      publisher: deal.publisher,
      poc: deal.poc,
      team: deal.team,
      status: deal.status,
      status_name: deal.status_name || deal.status,
      status_color: deal.status_color || '#6B7280',
      q_gross: deal.q_gross,
      q_net_rev: deal.q_net_rev,
      progress_percent: deal.progress_percent,
      next_action: deal.next_action,
      days_in_status: deal.days_in_status || 0
    }))
    .sort((a, b) => (b.q_gross || 0) - (a.q_gross || 0))
    .slice(0, 10)
}
