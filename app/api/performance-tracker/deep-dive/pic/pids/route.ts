import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../../lib/services/bigquery'
import { buildDeepDiveQuery, type Period } from '../../../../../../lib/services/deepDiveQueryBuilder'
import { getPerspectiveConfig } from '../../../../../../lib/config/perspectiveConfigs'

/**
 * PIC → PIDs Drill-down
 * Get all publishers (PIDs) belonging to a specific PIC
 */

interface PICPIDsRequest {
  pic: string
  period1: Period
  period2: Period
  filters: Record<string, any>
  tier?: string
}

export async function POST(request: NextRequest) {
  try {
    const { pic, period1, period2, filters, tier }: PICPIDsRequest = await request.json()

    // Get PID perspective data filtered by PIC
    const pidConfig = getPerspectiveConfig('pid')

    // Add PIC filter
    const pidFilters = { ...filters, pic }

    const query = buildDeepDiveQuery(pidConfig, {
      period1,
      period2,
      filters: pidFilters,
      tierFilter: tier
    })

    const pids = await BigQueryService.executeQuery(query)

    // Calculate summary
    const summary = {
      total_items: pids.length,
      total_revenue_p1: pids.reduce((sum, p) => sum + (p.rev_p1 || 0), 0),
      total_revenue_p2: pids.reduce((sum, p) => sum + (p.rev_p2 || 0), 0),
      revenue_change_pct: 0,
      tier_distribution: {} as Record<string, number>
    }

    if (summary.total_revenue_p1 > 0) {
      summary.revenue_change_pct = ((summary.total_revenue_p2 - summary.total_revenue_p1) / summary.total_revenue_p1) * 100
    }

    return NextResponse.json({
      status: 'ok',
      data: pids,
      summary,
      context: { pic, tier }
    })

  } catch (error) {
    console.error('PIC PIDs API Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
