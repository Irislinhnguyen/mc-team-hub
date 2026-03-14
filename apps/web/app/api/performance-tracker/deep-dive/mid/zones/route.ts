import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../../lib/services/bigquery'
import { buildDeepDiveQuery, type Period } from '../../../../../../lib/services/deepDiveQueryBuilder'
import { getPerspectiveConfig } from '../../../../../../lib/config/perspectiveConfigs'

/**
 * MID → Zones Drill-down
 * Get all zones belonging to a specific media property (MID)
 */

interface MIDZonesRequest {
  mid: number | string
  period1: Period
  period2: Period
  filters: Record<string, any>
  tier?: string
}

export async function POST(request: NextRequest) {
  try {
    const { mid, period1, period2, filters, tier }: MIDZonesRequest = await request.json()

    // Get Zone perspective data filtered by MID
    const zoneConfig = getPerspectiveConfig('zone')

    // Add MID filter
    const zoneFilters = { ...filters, mid: Number(mid) }

    const query = buildDeepDiveQuery(zoneConfig, {
      period1,
      period2,
      filters: zoneFilters,
      tierFilter: tier
    })

    const zones = await BigQueryService.executeQuery(query)

    // Calculate summary
    const summary = {
      total_items: zones.length,
      total_revenue_p1: zones.reduce((sum, z) => sum + (z.rev_p1 || 0), 0),
      total_revenue_p2: zones.reduce((sum, z) => sum + (z.rev_p2 || 0), 0),
      revenue_change_pct: 0,
      tier_distribution: {} as Record<string, number>
    }

    if (summary.total_revenue_p1 > 0) {
      summary.revenue_change_pct = ((summary.total_revenue_p2 - summary.total_revenue_p1) / summary.total_revenue_p1) * 100
    }

    return NextResponse.json({
      status: 'ok',
      data: zones,
      summary,
      context: { mid, tier }
    })

  } catch (error) {
    console.error('MID Zones API Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
