import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../../lib/services/bigquery'
import { buildDeepDiveQuery, type Period } from '../../../../../../lib/services/deepDiveQueryBuilder'
import { getPerspectiveConfig } from '../../../../../../lib/config/perspectiveConfigs'

/**
 * PID → MIDs Drill-down
 * Get all media properties (MIDs) belonging to a specific publisher (PID)
 */

interface PIDMIDsRequest {
  pid: number | string
  period1: Period
  period2: Period
  filters: Record<string, any>
  tier?: string
}

export async function POST(request: NextRequest) {
  try {
    const { pid, period1, period2, filters, tier }: PIDMIDsRequest = await request.json()

    // Get MID perspective data filtered by PID
    const midConfig = getPerspectiveConfig('mid')

    // Add PID filter
    const midFilters = { ...filters, pid: Number(pid) }

    const query = buildDeepDiveQuery(midConfig, {
      period1,
      period2,
      filters: midFilters,
      tierFilter: tier
    })

    const mids = await BigQueryService.executeQuery(query)

    // Calculate summary
    const summary = {
      total_items: mids.length,
      total_revenue_p1: mids.reduce((sum, m) => sum + (m.rev_p1 || 0), 0),
      total_revenue_p2: mids.reduce((sum, m) => sum + (m.rev_p2 || 0), 0),
      revenue_change_pct: 0,
      tier_distribution: {} as Record<string, number>
    }

    if (summary.total_revenue_p1 > 0) {
      summary.revenue_change_pct = ((summary.total_revenue_p2 - summary.total_revenue_p1) / summary.total_revenue_p1) * 100
    }

    return NextResponse.json({
      status: 'ok',
      data: mids,
      summary,
      context: { pid, tier }
    })

  } catch (error) {
    console.error('PID MIDs API Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
