/**
 * Pipeline Impact Tracking API (30-Day Calculation)
 * POST /api/pipelines/impact - Calculate variance between projected and actual BigQuery revenue
 *
 * CALCULATION LOGIC (Per Pipeline):
 *
 * NEW SLOT (classification = "New Unit (New Slot)"):
 *   - Projected_30d = day_gross × 30
 *   - Actual_30d = SUM(rev) WHERE DATE >= actual_starting_date AND DATE <= (actual_starting_date + 29)
 *   - Variance = Actual_30d - Projected_30d
 *
 * EXISTING SLOT (classification = "New Unit (Slot exists)"):
 *   - Projected_30d = day_gross × 30
 *   - Baseline_30d = SUM(rev) WHERE DATE >= (actual_starting_date - 30) AND DATE <= (actual_starting_date - 1)
 *   - After_30d = SUM(rev) WHERE DATE >= actual_starting_date AND DATE <= (actual_starting_date + 29)
 *   - Actual_30d = After_30d - Baseline_30d (THE GROWTH)
 *   - Variance = Actual_30d - Projected_30d
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'
import BigQueryService from '@/lib/services/bigquery'
import type { Pipeline } from '@/lib/types/pipeline'

interface ImpactRequest {
  status?: string[]  // Defaults to ['【S】']
  pocs?: string[]    // Filter by Person in Charge
  products?: string[] // Filter by Product
  slotTypes?: string[] // Filter by slot type: 'new' | 'existing'
  teams?: string[]   // Filter by team IDs (will be converted to PICs)
  group?: 'sales' | 'cs'  // Filter by pipeline group
  fiscalYear?: number  // Filter by fiscal year
  fiscalQuarter?: number  // Filter by fiscal quarter
}

interface PipelineImpact {
  id: string
  publisher: string
  poc: string
  status: string
  slot_type: 'new' | 'existing'
  actual_starting_date: string
  projected_30d: number
  actual_30d: number
  variance: number
  variance_percent: number
  affected_zones: string[]
  affected_zones_count: number
  pid: string | null
  mid: string | null
  granularity: 'pid_mid_zid' | 'pid_mid' | 'pid' | 'mid_zid' | 'mid' | 'zid'
  calculated_days: number
  is_locked: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body: ImpactRequest = await request.json()
    const status = body.status || ['【S】']  // Default to confirmed wins only
    const pocs = body.pocs || []
    const products = body.products || []
    const slotTypes = body.slotTypes || []
    const teams = body.teams || []
    const group = body.group  // Optional group filter
    const fiscalYear = body.fiscalYear  // Optional fiscal year filter
    const fiscalQuarter = body.fiscalQuarter  // Optional fiscal quarter filter

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // If teams filter is provided, get PICs for those teams
    let teamPICs: string[] = []
    if (teams.length > 0) {
      const { data: teamMappings } = await supabase
        .from('team_pic_mappings')
        .select('pipeline_poc_name')
        .in('team_id', teams)

      if (teamMappings) {
        teamPICs = teamMappings
          .map(m => m.pipeline_poc_name)
          .filter(poc => poc != null) as string[]
      }
    }

    // Fetch ALL pipelines with S status (show everything, even if missing required fields)
    // TEMPORARY: Also fetch starting_date as fallback for actual_starting_date
    // Include cache columns for daily refresh
    // Also fetch product field for filtering
    // Also fetch group field for filtering by sales/CS
    // NOTE: Removed .eq('user_id', auth.userId) - all authenticated users can see all pipelines
    let query = supabase
      .from('pipelines')
      .select('id, publisher, poc, status, pid, mid, classification, day_gross, actual_starting_date, starting_date, affected_zones, product, impact_last_calculated, impact_cached_value, group')
      .in('status', status)

    // Filter by group if specified
    if (group) {
      query = query.eq('group', group)
    }

    // Filter by fiscal year and quarter if specified
    if (fiscalYear && fiscalQuarter) {
      query = query.eq('fiscal_year', fiscalYear).eq('fiscal_quarter', fiscalQuarter)
    }

    // Apply PIC filter (combine direct PIC filter + team-based PICs)
    const allPICsFilter = [...pocs]
    if (teamPICs.length > 0) {
      allPICsFilter.push(...teamPICs)
    }
    if (allPICsFilter.length > 0) {
      query = query.in('poc', allPICsFilter)
    }

    const { data: pipelines, error } = await query

    if (error) {
      console.error('[Impact API] Error fetching pipelines:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pipelines' },
        { status: 500 }
      )
    }

    const allPipelines = pipelines as any[]

    // TEMPORARY: Fallback to starting_date if actual_starting_date is missing
    const pipelinesWithFallback = allPipelines.map(p => ({
      ...p,
      actual_starting_date: p.actual_starting_date || p.starting_date
    }))

    // Apply client-side filters (Product and Slot Type)
    let filteredPipelines = pipelinesWithFallback

    // Product filter - check if any product in comma-separated list matches
    if (products.length > 0) {
      filteredPipelines = filteredPipelines.filter(p => {
        if (!p.product) return false
        const pipelineProducts = p.product.split(',').map((s: string) => s.trim())
        return pipelineProducts.some((prod: string) => products.includes(prod))
      })
    }

    // Slot Type filter - based on classification
    if (slotTypes.length > 0) {
      filteredPipelines = filteredPipelines.filter(p => {
        if (!p.classification) return false
        const isNewSlot = p.classification === 'New Unit (New Slot)'
        const slotType = isNewSlot ? 'new' : 'existing'
        return slotTypes.includes(slotType)
      })
    }

    // Show ALL pipelines, but mark which ones can actually be calculated
    // Pipelines need actual_starting_date OR starting_date (fallback) for revenue calculation
    // EXCLUDE "adjustment" pipelines from impact calculation
    const today = new Date()
    const validPipelines = filteredPipelines.filter(p =>
      p.classification &&
      p.classification.toLowerCase() !== 'adjustment' &&
      (p.actual_starting_date || p.starting_date)  // Require at least one date
    )

    console.log(`[Impact API] Processing ${validPipelines.length} pipelines`)
    const fallbackCount = validPipelines.filter(p => !allPipelines.find(ap => ap.id === p.id)?.actual_starting_date && p.actual_starting_date).length
    if (fallbackCount > 0) {
      console.log(`[Impact API] Using starting_date fallback for ${fallbackCount} pipelines`)
    }

    // If no pipelines at all, return empty result
    if (validPipelines.length === 0) {
      return NextResponse.json({
        status: 'ok',
        data: {
          impacts: [],
        },
      })
    }

    // DAILY CACHE LOGIC: Check if we need to refresh data from BigQuery
    // If any pipeline has stale cache (>24h or null), refresh ALL pipelines
    const now = new Date()
    const cacheAgeHours = 24

    // Check if we need to refresh cache
    const needsRefresh = validPipelines.some(p => {
      if (!p.impact_last_calculated) return true  // No cache yet
      const cacheAge = (now.getTime() - new Date(p.impact_last_calculated).getTime()) / (1000 * 60 * 60)
      return cacheAge > cacheAgeHours  // Cache older than 24h
    })

    console.log(`[Impact API] Cache status: ${needsRefresh ? 'STALE - will refresh' : 'FRESH - using cache'}`)

    // If cache is fresh, return cached values immediately
    if (!needsRefresh) {
      console.log('[Impact API] Using cached data, no BigQuery query needed')

      const impacts: PipelineImpact[] = validPipelines.map(pipeline => {
        const actualRevenue = pipeline.impact_cached_value ? Number(pipeline.impact_cached_value) : 0
        const projected30d = (pipeline.day_gross || 0) * 30
        const variance = actualRevenue - projected30d
        const variancePercent = projected30d !== 0
          ? (variance / projected30d) * 100
          : actualRevenue > 0 ? 100 : -100

        const slotType = pipeline.classification === 'New Unit (New Slot)' ? 'new' : 'existing'
        let granularity: 'pid_mid_zid' | 'pid_mid' | 'pid' | 'mid_zid' | 'mid' | 'zid'
        if (pipeline.pid && pipeline.mid && pipeline.affected_zones && pipeline.affected_zones.length > 0) {
          granularity = 'pid_mid_zid'
        } else if (pipeline.pid && pipeline.mid) {
          granularity = 'pid_mid'
        } else if (pipeline.pid) {
          granularity = 'pid'
        } else if (pipeline.mid && pipeline.affected_zones && pipeline.affected_zones.length > 0) {
          granularity = 'mid_zid'
        } else if (pipeline.mid) {
          granularity = 'mid'
        } else {
          granularity = 'zid'
        }

        let calculatedDays = 0
        if (pipeline.actual_starting_date) {
          const startDate = new Date(pipeline.actual_starting_date)
          const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          calculatedDays = Math.min(30, Math.max(0, daysSinceStart))
        }

        return {
          id: pipeline.id,
          publisher: pipeline.publisher,
          poc: pipeline.poc,
          status: pipeline.status,
          slot_type: slotType,
          actual_starting_date: pipeline.actual_starting_date,
          projected_30d: projected30d,
          actual_30d: actualRevenue,
          variance,
          variance_percent: variancePercent,
          affected_zones: pipeline.affected_zones || [],
          affected_zones_count: pipeline.affected_zones?.length || 0,
          pid: pipeline.pid,
          mid: pipeline.mid || null,
          granularity,
          calculated_days: calculatedDays,
          is_locked: false  // No more lock mechanism
        }
      })

      return NextResponse.json({
        status: 'ok',
        data: { impacts }
      })
    }

    // Cache is stale - need to query BigQuery for ALL pipelines
    console.log('[Impact API] Cache stale, querying BigQuery...')

    // Classify pipelines by granularity level (only those that CAN be calculated)
    // Calculate from day 1 - no minimum days requirement
    const pipelinesByGranularity = {
      // Level 6: PID + MID + ZID (most granular)
      pid_mid_zid: validPipelines.filter(p => {
        if (!p.pid || !p.mid || !p.affected_zones || p.affected_zones.length === 0) return false
        return true  // Already filtered for date above
      }),
      // Level 5: PID + MID (no zones)
      pid_mid: validPipelines.filter(p => {
        if (!p.pid || !p.mid || (p.affected_zones && p.affected_zones.length > 0)) return false
        return true  // Already filtered for date above
      }),
      // Level 4: PID only
      pid: validPipelines.filter(p => {
        if (!p.pid || p.mid) return false
        return true  // Already filtered for date above
      }),
      // Level 3: MID + ZID (no PID)
      mid_zid: validPipelines.filter(p => {
        if (p.pid || !p.mid || !p.affected_zones || p.affected_zones.length === 0) return false
        return true  // Already filtered for date above
      }),
      // Level 2: MID only (no PID, no zones)
      mid: validPipelines.filter(p => {
        if (p.pid || !p.mid || (p.affected_zones && p.affected_zones.length > 0)) return false
        return true  // Already filtered for date above
      }),
      // Level 1: ZID only (no PID, no MID)
      zid: validPipelines.filter(p => {
        if (p.pid || p.mid || !p.affected_zones || p.affected_zones.length === 0) return false
        return true  // Already filtered for date above
      })
    }

    console.log('[Impact API] Granularity breakdown:', {
      level6_pid_mid_zid: pipelinesByGranularity.pid_mid_zid.length,
      level5_pid_mid: pipelinesByGranularity.pid_mid.length,
      level4_pid: pipelinesByGranularity.pid.length,
      level3_mid_zid: pipelinesByGranularity.mid_zid.length,
      level2_mid: pipelinesByGranularity.mid.length,
      level1_zid: pipelinesByGranularity.zid.length,
      total: validPipelines.length
    })

    // Debug: Show sample pipelines for MID-only levels
    if (pipelinesByGranularity.mid.length > 0) {
      console.log('[Impact API] Sample MID-only pipeline:', {
        id: pipelinesByGranularity.mid[0].id,
        publisher: pipelinesByGranularity.mid[0].publisher,
        pid: pipelinesByGranularity.mid[0].pid,
        mid: pipelinesByGranularity.mid[0].mid,
        mid_type: typeof pipelinesByGranularity.mid[0].mid
      })
    }
    if (pipelinesByGranularity.mid_zid.length > 0) {
      console.log('[Impact API] Sample MID+ZID pipeline:', {
        id: pipelinesByGranularity.mid_zid[0].id,
        publisher: pipelinesByGranularity.mid_zid[0].publisher,
        pid: pipelinesByGranularity.mid_zid[0].pid,
        mid: pipelinesByGranularity.mid_zid[0].mid,
        zones: pipelinesByGranularity.mid_zid[0].affected_zones
      })
    }

    // Helper function to format dates for BigQuery
    function formatDateForBQ(date: Date): string {
      return date.toISOString().split('T')[0]
    }

    // Helper function to validate PID/MID are valid numbers
    function validatePipelineIds(
      pipelines: any[],
      options: { requirePid?: boolean; requireMid?: boolean } = { requirePid: true, requireMid: false }
    ): any[] {
      return pipelines.filter(p => {
        // Validate PID if required
        if (options.requirePid !== false) {
          const pidNum = Number(p.pid)
          if (isNaN(pidNum)) {
            console.warn(`[Impact API] Skipping pipeline ${p.id} (${p.publisher}): invalid PID (${p.pid})`)
            return false
          }
        }

        // Validate MID if required
        if (options.requireMid) {
          const midNum = Number(p.mid)
          if (isNaN(midNum)) {
            console.warn(`[Impact API] Skipping pipeline ${p.id} (${p.publisher}): invalid MID (${p.mid})`)
            return false
          }
        }

        return true
      })
    }

    // Build dynamic 30-day BigQuery query
    const cteSections: string[] = []
    const resultSelects: string[] = []
    const unionParts: string[] = []

    // Helper functions to determine slot type
    const isNewSlotType = (classification: string | null) => {
      if (!classification) return false
      return classification === 'New Unit (New Slot)' ||
             classification === 'New Unit (Slot exists)' ||
             classification === 'New Acquisition'
    }

    const isExistingSlotType = (classification: string | null) => {
      if (!classification) return false
      return classification === 'Existing Unit (Slot exists)'
    }

    // ========== NEW SLOT QUERIES ==========
    // Includes: "New Unit (New Slot)", "New Unit (Slot exists)", "New Acquisition"
    // Only "Existing Unit (Slot exists)" uses baseline calculation

    // NEW SLOT - Level 6: PID + MID + ZID
    const newSlotLevel3Raw = pipelinesByGranularity.pid_mid_zid.filter(p =>
      isNewSlotType(p.classification)
    )
    const newSlotLevel3 = validatePipelineIds(newSlotLevel3Raw, { requirePid: true, requireMid: true })
    if (newSlotLevel3.length > 0) {
      const rows = newSlotLevel3.map(p => {
          const zones = p.affected_zones!.map(z => {
            const num = Number(z)
            return isNaN(num) ? `'${z}'` : String(num)
          }).join(', ')
          const sDate = new Date(p.actual_starting_date)
          const maxEndDate = new Date(sDate)
          maxEndDate.setDate(sDate.getDate() + 29) // 30 days total
          const actualEndDate = maxEndDate <= now ? maxEndDate : now // Use available data

          return `SELECT ${p.pid} as pid, ${p.mid} as mid, [${zones}] as zones, '${p.id}' as pipeline_id, '${formatDateForBQ(sDate)}' as start_date, '${formatDateForBQ(actualEndDate)}' as end_date`
        }).join(' UNION ALL\n      ')

      cteSections.push(`new_slot_level3_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`new_slot_level3_results AS (
      SELECT p.pid, p.mid, p.pipeline_id, SUM(agg.rev) as actual_revenue, 'pid_mid_zid' as granularity, 'new_slot' as slot_type
      FROM new_slot_level3_pipelines p
      CROSS JOIN UNNEST(p.zones) as zone_id
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.pid = p.pid AND agg.mid = p.mid AND agg.zid = zone_id
        AND agg.DATE >= DATE(p.start_date) AND agg.DATE <= DATE(p.end_date)
      GROUP BY p.pid, p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT * FROM new_slot_level3_results')
    }

    // NEW SLOT - Level 5: PID + MID
    const newSlotLevel2Raw = pipelinesByGranularity.pid_mid.filter(p =>
      isNewSlotType(p.classification)
    )
    const newSlotLevel2 = validatePipelineIds(newSlotLevel2Raw, { requirePid: true, requireMid: true })
    if (newSlotLevel2.length > 0) {
      const rows = newSlotLevel2.map(p => {
        const sDate = new Date(p.actual_starting_date)
        const maxEndDate = new Date(sDate)
        maxEndDate.setDate(sDate.getDate() + 29) // 30 days total
        const actualEndDate = maxEndDate <= now ? maxEndDate : now // Use available data

        return `SELECT ${p.pid} as pid, ${p.mid} as mid, '${p.id}' as pipeline_id, '${formatDateForBQ(sDate)}' as start_date, '${formatDateForBQ(actualEndDate)}' as end_date`
      }).join(' UNION ALL\n      ')

      cteSections.push(`new_slot_level2_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`new_slot_level2_results AS (
      SELECT p.pid, p.mid, p.pipeline_id, SUM(agg.rev) as actual_revenue, 'pid_mid' as granularity, 'new_slot' as slot_type
      FROM new_slot_level2_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.pid = p.pid AND agg.mid = p.mid
        AND agg.DATE >= DATE(p.start_date) AND agg.DATE <= DATE(p.end_date)
      GROUP BY p.pid, p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT * FROM new_slot_level2_results')
    }

    // NEW SLOT - Level 4: PID only
    const newSlotLevel1Raw = pipelinesByGranularity.pid.filter(p =>
      isNewSlotType(p.classification)
    )
    const newSlotLevel1 = validatePipelineIds(newSlotLevel1Raw, { requirePid: true, requireMid: false })
    if (newSlotLevel1.length > 0) {
      const rows = newSlotLevel1.map(p => {
        const sDate = new Date(p.actual_starting_date)
        const maxEndDate = new Date(sDate)
        maxEndDate.setDate(sDate.getDate() + 29) // 30 days total
        const actualEndDate = maxEndDate <= now ? maxEndDate : now // Use available data

        return `SELECT ${p.pid} as pid, '${p.id}' as pipeline_id, '${formatDateForBQ(sDate)}' as start_date, '${formatDateForBQ(actualEndDate)}' as end_date`
      }).join(' UNION ALL\n      ')

      cteSections.push(`new_slot_level1_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`new_slot_level1_results AS (
      SELECT p.pid, NULL as mid, p.pipeline_id, SUM(agg.rev) as actual_revenue, 'pid' as granularity, 'new_slot' as slot_type
      FROM new_slot_level1_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.pid = p.pid
        AND agg.DATE >= DATE(p.start_date) AND agg.DATE <= DATE(p.end_date)
      GROUP BY p.pid, p.pipeline_id
    )`)
      unionParts.push('SELECT * FROM new_slot_level1_results')
    }

    // ========== EXISTING SLOT QUERIES (with baseline + after) ==========

    // EXISTING SLOT - Level 6: PID + MID + ZID
    // Accept both "New Unit (Slot exists)" and "Existing Unit (Slot exists)"
    const existingSlotLevel3Raw = pipelinesByGranularity.pid_mid_zid.filter(p =>
      p.classification && p.classification.includes('Slot exists')
    )
    const existingSlotLevel3 = validatePipelineIds(existingSlotLevel3Raw, { requirePid: true, requireMid: true })
    if (existingSlotLevel3.length > 0) {
      const rows = existingSlotLevel3.map(p => {
        const zones = p.affected_zones!.map(z => {
          const num = Number(z)
          return isNaN(num) ? `'${z}'` : String(num)
        }).join(', ')
        const sDate = new Date(p.actual_starting_date)

        const baselineStart = new Date(sDate)
        baselineStart.setDate(sDate.getDate() - 30)
        const baselineEnd = new Date(sDate)
        baselineEnd.setDate(sDate.getDate() - 1)

        const afterStart = sDate
        const afterEnd = new Date(sDate)
        afterEnd.setDate(sDate.getDate() + 29)

        return `SELECT ${p.pid} as pid, ${p.mid} as mid, [${zones}] as zones, '${p.id}' as pipeline_id, '${formatDateForBQ(baselineStart)}' as baseline_start, '${formatDateForBQ(baselineEnd)}' as baseline_end, '${formatDateForBQ(afterStart)}' as after_start, '${formatDateForBQ(afterEnd)}' as after_end`
      }).join(' UNION ALL\n      ')

      cteSections.push(`existing_slot_level3_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`existing_slot_level3_results AS (
      SELECT p.pid, p.mid, p.pipeline_id,
        SUM(CASE WHEN agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end) THEN agg.rev ELSE 0 END) -
        SUM(CASE WHEN agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end) THEN agg.rev ELSE 0 END) as actual_revenue,
        'pid_mid_zid' as granularity, 'existing_slot' as slot_type
      FROM existing_slot_level3_pipelines p
      CROSS JOIN UNNEST(p.zones) as zone_id
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.pid = p.pid AND agg.mid = p.mid AND agg.zid = zone_id
        AND ((agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end)) OR (agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end)))
      GROUP BY p.pid, p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM existing_slot_level3_results')
    }

    // EXISTING SLOT - Level 5: PID + MID
    // ONLY "Existing Unit (Slot exists)" uses baseline calculation
    const existingSlotLevel2Raw = pipelinesByGranularity.pid_mid.filter(p =>
      isExistingSlotType(p.classification)
    )
    const existingSlotLevel2 = validatePipelineIds(existingSlotLevel2Raw, { requirePid: true, requireMid: true })
    if (existingSlotLevel2.length > 0) {
      const rows = existingSlotLevel2.map(p => {
        const sDate = new Date(p.actual_starting_date)

        const baselineStart = new Date(sDate)
        baselineStart.setDate(sDate.getDate() - 30)
        const baselineEnd = new Date(sDate)
        baselineEnd.setDate(sDate.getDate() - 1)

        const afterStart = sDate
        const afterEnd = new Date(sDate)
        afterEnd.setDate(sDate.getDate() + 29)

        return `SELECT ${p.pid} as pid, ${p.mid} as mid, '${p.id}' as pipeline_id, '${formatDateForBQ(baselineStart)}' as baseline_start, '${formatDateForBQ(baselineEnd)}' as baseline_end, '${formatDateForBQ(afterStart)}' as after_start, '${formatDateForBQ(afterEnd)}' as after_end`
      }).join(' UNION ALL\n      ')

      cteSections.push(`existing_slot_level2_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`existing_slot_level2_results AS (
      SELECT p.pid, p.mid, p.pipeline_id,
        SUM(CASE WHEN agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end) THEN agg.rev ELSE 0 END) -
        SUM(CASE WHEN agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end) THEN agg.rev ELSE 0 END) as actual_revenue,
        'pid_mid' as granularity, 'existing_slot' as slot_type
      FROM existing_slot_level2_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.pid = p.pid AND agg.mid = p.mid
        AND ((agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end)) OR (agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end)))
      GROUP BY p.pid, p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM existing_slot_level2_results')
    }

    // EXISTING SLOT - Level 4: PID only
    // ONLY "Existing Unit (Slot exists)" uses baseline calculation
    const existingSlotLevel1Raw = pipelinesByGranularity.pid.filter(p =>
      isExistingSlotType(p.classification)
    )
    const existingSlotLevel1 = validatePipelineIds(existingSlotLevel1Raw, { requirePid: true, requireMid: false })
    if (existingSlotLevel1.length > 0) {
      const rows = existingSlotLevel1.map(p => {
        const sDate = new Date(p.actual_starting_date)

        const baselineStart = new Date(sDate)
        baselineStart.setDate(sDate.getDate() - 30)
        const baselineEnd = new Date(sDate)
        baselineEnd.setDate(sDate.getDate() - 1)

        const afterStart = sDate
        const afterEnd = new Date(sDate)
        afterEnd.setDate(sDate.getDate() + 29)

        return `SELECT ${p.pid} as pid, '${p.id}' as pipeline_id, '${formatDateForBQ(baselineStart)}' as baseline_start, '${formatDateForBQ(baselineEnd)}' as baseline_end, '${formatDateForBQ(afterStart)}' as after_start, '${formatDateForBQ(afterEnd)}' as after_end`
      }).join(' UNION ALL\n      ')

      cteSections.push(`existing_slot_level1_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`existing_slot_level1_results AS (
      SELECT p.pid, NULL as mid, p.pipeline_id,
        SUM(CASE WHEN agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end) THEN agg.rev ELSE 0 END) -
        SUM(CASE WHEN agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end) THEN agg.rev ELSE 0 END) as actual_revenue,
        'pid' as granularity, 'existing_slot' as slot_type
      FROM existing_slot_level1_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.pid = p.pid
        AND ((agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end)) OR (agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end)))
      GROUP BY p.pid, p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM existing_slot_level1_results')
    }

    // ========== MID-ONLY QUERIES (no PID) ==========

    // NEW SLOT - Level 3: MID + ZID (no PID)
    const newSlotMidZidRaw = pipelinesByGranularity.mid_zid.filter(p =>
      isNewSlotType(p.classification)
    )
    const newSlotMidZid = validatePipelineIds(newSlotMidZidRaw, { requirePid: false, requireMid: true })
    if (newSlotMidZid.length > 0) {
      const rows = newSlotMidZid.map(p => {
        const zones = p.affected_zones!.map(z => {
          const num = Number(z)
          return isNaN(num) ? `'${z}'` : String(num)
        }).join(', ')
        const sDate = new Date(p.actual_starting_date)
        const maxEndDate = new Date(sDate)
        maxEndDate.setDate(sDate.getDate() + 29) // 30 days total
        const actualEndDate = maxEndDate <= now ? maxEndDate : now // Use available data

        return `SELECT ${p.mid} as mid, [${zones}] as zones, '${p.id}' as pipeline_id, '${formatDateForBQ(sDate)}' as start_date, '${formatDateForBQ(actualEndDate)}' as end_date`
      }).join(' UNION ALL\n      ')

      cteSections.push(`new_slot_mid_zid_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`new_slot_mid_zid_results AS (
      SELECT NULL as pid, p.mid, p.pipeline_id, SUM(agg.rev) as actual_revenue, 'mid_zid' as granularity, 'new_slot' as slot_type
      FROM new_slot_mid_zid_pipelines p
      CROSS JOIN UNNEST(p.zones) as zone_id
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.mid = p.mid AND agg.zid = zone_id
        AND agg.DATE >= DATE(p.start_date) AND agg.DATE <= DATE(p.end_date)
      GROUP BY p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM new_slot_mid_zid_results')
    }

    // NEW SLOT - Level 2: MID only (no PID, no zones)
    const newSlotMidRaw = pipelinesByGranularity.mid.filter(p =>
      isNewSlotType(p.classification)
    )
    const newSlotMid = validatePipelineIds(newSlotMidRaw, { requirePid: false, requireMid: true })
    if (newSlotMidRaw.length > newSlotMid.length) {
      console.log(`[Impact API] Validation skipped ${newSlotMidRaw.length - newSlotMid.length} MID-only new slot pipelines`)
    }
    if (newSlotMid.length > 0) {
      const rows = newSlotMid.map(p => {
        const sDate = new Date(p.actual_starting_date)
        const maxEndDate = new Date(sDate)
        maxEndDate.setDate(sDate.getDate() + 29) // 30 days total
        const actualEndDate = maxEndDate <= now ? maxEndDate : now // Use available data

        return `SELECT ${p.mid} as mid, '${p.id}' as pipeline_id, '${formatDateForBQ(sDate)}' as start_date, '${formatDateForBQ(actualEndDate)}' as end_date`
      }).join(' UNION ALL\n      ')

      cteSections.push(`new_slot_mid_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`new_slot_mid_results AS (
      SELECT NULL as pid, p.mid, p.pipeline_id, SUM(agg.rev) as actual_revenue, 'mid' as granularity, 'new_slot' as slot_type
      FROM new_slot_mid_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.mid = p.mid
        AND agg.DATE >= DATE(p.start_date) AND agg.DATE <= DATE(p.end_date)
      GROUP BY p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM new_slot_mid_results')
    }

    // EXISTING SLOT - Level 3: MID + ZID (no PID)
    // ONLY "Existing Unit (Slot exists)" uses baseline calculation
    const existingSlotMidZidRaw = pipelinesByGranularity.mid_zid.filter(p =>
      isExistingSlotType(p.classification)
    )
    const existingSlotMidZid = validatePipelineIds(existingSlotMidZidRaw, { requirePid: false, requireMid: true })
    if (existingSlotMidZid.length > 0) {
      const rows = existingSlotMidZid.map(p => {
        const zones = p.affected_zones!.map(z => {
          const num = Number(z)
          return isNaN(num) ? `'${z}'` : String(num)
        }).join(', ')
        const sDate = new Date(p.actual_starting_date)

        const baselineStart = new Date(sDate)
        baselineStart.setDate(sDate.getDate() - 30)
        const baselineEnd = new Date(sDate)
        baselineEnd.setDate(sDate.getDate() - 1)

        const afterStart = sDate
        const afterEnd = new Date(sDate)
        afterEnd.setDate(sDate.getDate() + 29)

        return `SELECT ${p.mid} as mid, [${zones}] as zones, '${p.id}' as pipeline_id, '${formatDateForBQ(baselineStart)}' as baseline_start, '${formatDateForBQ(baselineEnd)}' as baseline_end, '${formatDateForBQ(afterStart)}' as after_start, '${formatDateForBQ(afterEnd)}' as after_end`
      }).join(' UNION ALL\n      ')

      cteSections.push(`existing_slot_mid_zid_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`existing_slot_mid_zid_results AS (
      SELECT NULL as pid, p.mid, p.pipeline_id,
        SUM(CASE WHEN agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end) THEN agg.rev ELSE 0 END) -
        SUM(CASE WHEN agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end) THEN agg.rev ELSE 0 END) as actual_revenue,
        'mid_zid' as granularity, 'existing_slot' as slot_type
      FROM existing_slot_mid_zid_pipelines p
      CROSS JOIN UNNEST(p.zones) as zone_id
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.mid = p.mid AND agg.zid = zone_id
        AND ((agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end)) OR (agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end)))
      GROUP BY p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM existing_slot_mid_zid_results')
    }

    // EXISTING SLOT - Level 2: MID only (no PID, no zones)
    // ONLY "Existing Unit (Slot exists)" uses baseline calculation
    const existingSlotMidRaw = pipelinesByGranularity.mid.filter(p =>
      isExistingSlotType(p.classification)
    )
    const existingSlotMid = validatePipelineIds(existingSlotMidRaw, { requirePid: false, requireMid: true })
    if (existingSlotMidRaw.length > existingSlotMid.length) {
      console.log(`[Impact API] Validation skipped ${existingSlotMidRaw.length - existingSlotMid.length} MID-only existing slot pipelines`)
    }
    if (existingSlotMid.length > 0) {
      const rows = existingSlotMid.map(p => {
        const sDate = new Date(p.actual_starting_date)

        const baselineStart = new Date(sDate)
        baselineStart.setDate(sDate.getDate() - 30)
        const baselineEnd = new Date(sDate)
        baselineEnd.setDate(sDate.getDate() - 1)

        const afterStart = sDate
        const afterEnd = new Date(sDate)
        afterEnd.setDate(sDate.getDate() + 29)

        return `SELECT ${p.mid} as mid, '${p.id}' as pipeline_id, '${formatDateForBQ(baselineStart)}' as baseline_start, '${formatDateForBQ(baselineEnd)}' as baseline_end, '${formatDateForBQ(afterStart)}' as after_start, '${formatDateForBQ(afterEnd)}' as after_end`
      }).join(' UNION ALL\n      ')

      cteSections.push(`existing_slot_mid_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`existing_slot_mid_results AS (
      SELECT NULL as pid, p.mid, p.pipeline_id,
        SUM(CASE WHEN agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end) THEN agg.rev ELSE 0 END) -
        SUM(CASE WHEN agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end) THEN agg.rev ELSE 0 END) as actual_revenue,
        'mid' as granularity, 'existing_slot' as slot_type
      FROM existing_slot_mid_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.mid = p.mid
        AND ((agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end)) OR (agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end)))
      GROUP BY p.mid, p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM existing_slot_mid_results')
    }

    // ========== ZID-ONLY QUERIES (no PID, no MID) ==========

    // NEW SLOT - Level 1: ZID only (no PID, no MID)
    // Each zone becomes a separate row in the query
    const newSlotZidRaw = pipelinesByGranularity.zid.filter(p =>
      isNewSlotType(p.classification)
    )
    if (newSlotZidRaw.length > 0) {
      // Expand each pipeline into multiple rows (one per zone)
      const rows = newSlotZidRaw.flatMap(p => {
        const sDate = new Date(p.actual_starting_date)
        const maxEndDate = new Date(sDate)
        maxEndDate.setDate(sDate.getDate() + 29) // 30 days total
        const actualEndDate = maxEndDate <= now ? maxEndDate : now // Use available data

        // Create one row per zone
        return p.affected_zones!.map(zone => {
          const zoneValue = isNaN(Number(zone)) ? `'${zone}'` : zone
          return `SELECT ${zoneValue} as zid, '${p.id}' as pipeline_id, '${formatDateForBQ(sDate)}' as start_date, '${formatDateForBQ(actualEndDate)}' as end_date`
        })
      }).join(' UNION ALL\n      ')

      cteSections.push(`new_slot_zid_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`new_slot_zid_results AS (
      SELECT NULL as pid, NULL as mid, p.pipeline_id, SUM(agg.rev) as actual_revenue, 'zid' as granularity, 'new_slot' as slot_type
      FROM new_slot_zid_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.zid = p.zid
        AND agg.DATE >= DATE(p.start_date) AND agg.DATE <= DATE(p.end_date)
      GROUP BY p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM new_slot_zid_results')
    }

    // EXISTING SLOT - Level 1: ZID only (no PID, no MID)
    // ONLY "Existing Unit (Slot exists)" uses baseline calculation
    const existingSlotZidRaw = pipelinesByGranularity.zid.filter(p =>
      isExistingSlotType(p.classification)
    )
    if (existingSlotZidRaw.length > 0) {
      // Expand each pipeline into multiple rows (one per zone)
      const rows = existingSlotZidRaw.flatMap(p => {
        const sDate = new Date(p.actual_starting_date)

        const baselineStart = new Date(sDate)
        baselineStart.setDate(sDate.getDate() - 30)
        const baselineEnd = new Date(sDate)
        baselineEnd.setDate(sDate.getDate() - 1)

        const afterStart = sDate
        const afterEnd = new Date(sDate)
        afterEnd.setDate(sDate.getDate() + 29)

        // Create one row per zone
        return p.affected_zones!.map(zone => {
          const zoneValue = isNaN(Number(zone)) ? `'${zone}'` : zone
          return `SELECT ${zoneValue} as zid, '${p.id}' as pipeline_id, '${formatDateForBQ(baselineStart)}' as baseline_start, '${formatDateForBQ(baselineEnd)}' as baseline_end, '${formatDateForBQ(afterStart)}' as after_start, '${formatDateForBQ(afterEnd)}' as after_end`
        })
      }).join(' UNION ALL\n      ')

      cteSections.push(`existing_slot_zid_pipelines AS (\n      ${rows}\n    )`)
      resultSelects.push(`existing_slot_zid_results AS (
      SELECT NULL as pid, NULL as mid, p.pipeline_id,
        SUM(CASE WHEN agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end) THEN agg.rev ELSE 0 END) -
        SUM(CASE WHEN agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end) THEN agg.rev ELSE 0 END) as actual_revenue,
        'zid' as granularity, 'existing_slot' as slot_type
      FROM existing_slot_zid_pipelines p
      INNER JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\` agg
        ON agg.zid = p.zid
        AND ((agg.DATE >= DATE(p.baseline_start) AND agg.DATE <= DATE(p.baseline_end)) OR (agg.DATE >= DATE(p.after_start) AND agg.DATE <= DATE(p.after_end)))
      GROUP BY p.pipeline_id
    )`)
      unionParts.push('SELECT pid, mid, pipeline_id, actual_revenue, granularity, slot_type FROM existing_slot_zid_results')
    }

    // Execute BigQuery only if we have valid pipelines
    let bigqueryResults: any[] = []
    if (unionParts.length > 0) {
      const bigqueryQuery = `WITH\n    ${cteSections.join(',\n    ')},\n    ${resultSelects.join(',\n    ')}\n${unionParts.join('\nUNION ALL\n')}`

      console.log('========== GENERATED BIGQUERY QUERY ==========')
      console.log(bigqueryQuery)
      console.log('========== PIPELINE DATA BEING QUERIED ==========')
      console.log({
        totalPipelines: validPipelines.length,
        newSlotLevel3: newSlotLevel3.length,
        newSlotLevel2: newSlotLevel2.length,
        newSlotLevel1: newSlotLevel1.length,
        existingSlotLevel3: existingSlotLevel3.length,
        existingSlotLevel2: existingSlotLevel2.length,
        existingSlotLevel1: existingSlotLevel1.length,
        unionPartsCount: unionParts.length
      })
      console.log('=============================================')

      try {
        bigqueryResults = await BigQueryService.executeQuery(bigqueryQuery)
      } catch (error) {
        console.error('[Impact API] ========== BIGQUERY ERROR DETAILS ==========')
        console.error('Error type:', error?.constructor?.name)
        console.error('Error message:', error instanceof Error ? error.message : String(error))
        console.error('Error stack:', error instanceof Error ? error.stack : 'N/A')
        if (error && typeof error === 'object') {
          console.error('Full error object:', JSON.stringify(error, null, 2))
        }
        console.error('Query that failed (first 500 chars):', bigqueryQuery.substring(0, 500) + '...')
        console.error('========================================')

        const errorMsg = error instanceof Error ? error.message : String(error)

        // Pattern 1: Table not found
        if (errorMsg.includes('Not found: Table') || errorMsg.includes('404')) {
          return NextResponse.json({
            error: 'BigQuery table not found',
            details: 'Table agg_monthly_with_pic_table_6_month does not exist',
            suggestion: 'Contact data team to restore the table'
          }, { status: 500 })
        }

        // Pattern 2: Permission denied
        if (errorMsg.includes('permission') || errorMsg.includes('403')) {
          return NextResponse.json({
            error: 'BigQuery permission denied',
            details: 'Service account lacks read access',
            suggestion: 'Grant BigQuery Data Viewer role to service account'
          }, { status: 500 })
        }

        // Pattern 3: Query timeout
        if (errorMsg.includes('timeout') || errorMsg.includes('deadline')) {
          return NextResponse.json({
            error: 'BigQuery query timeout',
            details: 'Query took too long to execute',
            suggestion: 'Reduce number of pipelines or optimize query'
          }, { status: 500 })
        }

        // Pattern 4: Invalid query syntax
        if (errorMsg.includes('syntax') || errorMsg.includes('Unexpected')) {
          return NextResponse.json({
            error: 'Invalid BigQuery SQL',
            details: errorMsg,
            suggestion: 'Check generated query for syntax errors'
          }, { status: 500 })
        }

        // Generic error
        return NextResponse.json({
          error: 'BigQuery execution failed',
          details: errorMsg,
          query_preview: bigqueryQuery.substring(0, 200),
          hint: 'Check server logs for full query and error details'
        }, { status: 500 })
      }
    } else {
      console.log('[Impact API] No pipelines with PID found, skipping BigQuery')
    }

    // Create lookup map using pipeline_id for fast BigQuery result matching
    const revenueMap = new Map<string, { actual_revenue: number; granularity: string; slot_type: string }>()
    for (const row of bigqueryResults) {
      revenueMap.set(row.pipeline_id, {
        actual_revenue: Number(row.actual_revenue) || 0,
        granularity: row.granularity,
        slot_type: row.slot_type
      })
    }

    // Track pipelines for cache update
    const pipelinesToCache: Array<{
      id: string
      impact_cached_value: number
    }> = []

    // Calculate variance for each pipeline with 30-day logic
    const impacts: PipelineImpact[] = validPipelines
      .map(pipeline => {
        // Get fresh data from BigQuery
        const result = revenueMap.get(pipeline.id)
        const actualRevenue = result?.actual_revenue || 0

        // Add to cache update list
        pipelinesToCache.push({
          id: pipeline.id,
          impact_cached_value: actualRevenue
        })

        // Projected = day_gross × 30
        const projected30d = (pipeline.day_gross || 0) * 30

        // Calculate variance
        const variance = actualRevenue - projected30d
        const variancePercent = projected30d !== 0
          ? (variance / projected30d) * 100
          : actualRevenue > 0
            ? 100  // If no projection but has actual revenue, 100% over
            : -100 // If no projection and no actual revenue, 100% under

        // Determine slot type from classification
        const slotType = pipeline.classification === 'New Unit (New Slot)' ? 'new' : 'existing'

        // Determine granularity based on available fields (all 6 levels)
        let granularity: 'pid_mid_zid' | 'pid_mid' | 'pid' | 'mid_zid' | 'mid' | 'zid'
        if (pipeline.pid && pipeline.mid && pipeline.affected_zones && pipeline.affected_zones.length > 0) {
          granularity = 'pid_mid_zid'
        } else if (pipeline.pid && pipeline.mid) {
          granularity = 'pid_mid'
        } else if (pipeline.pid) {
          granularity = 'pid'
        } else if (pipeline.mid && pipeline.affected_zones && pipeline.affected_zones.length > 0) {
          granularity = 'mid_zid'
        } else if (pipeline.mid) {
          granularity = 'mid'
        } else {
          granularity = 'zid'
        }

        // Calculate how many days of data we have (0-30)
        let calculatedDays = 0
        if (pipeline.actual_starting_date) {
          const startDate = new Date(pipeline.actual_starting_date)
          const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          calculatedDays = Math.min(30, Math.max(0, daysSinceStart))
        }

        return {
          id: pipeline.id,
          publisher: pipeline.publisher,
          poc: pipeline.poc,
          status: pipeline.status,
          slot_type: slotType,
          actual_starting_date: pipeline.actual_starting_date,
          projected_30d: projected30d,
          actual_30d: actualRevenue,
          variance,
          variance_percent: variancePercent,
          affected_zones: pipeline.affected_zones || [],
          affected_zones_count: pipeline.affected_zones?.length || 0,
          pid: pipeline.pid,
          mid: pipeline.mid || null,
          granularity,
          calculated_days: calculatedDays,
          is_locked: false  // No more lock mechanism
        }
      })
      // Sort by actual_starting_date descending (most recent S- first)
      // Push null dates to the end
      .sort((a, b) => {
        if (!a.actual_starting_date && !b.actual_starting_date) return 0
        if (!a.actual_starting_date) return 1  // a to the end
        if (!b.actual_starting_date) return -1  // b to the end
        return new Date(b.actual_starting_date).getTime() - new Date(a.actual_starting_date).getTime()
      })

    // UPDATE CACHE: Save all calculated values to database for 24h caching
    if (pipelinesToCache.length > 0) {
      console.log(`[Impact API] Updating cache for ${pipelinesToCache.length} pipelines`)

      for (const pipelineCache of pipelinesToCache) {
        try {
          const { error: updateError } = await supabase
            .from('pipelines')
            .update({
              impact_cached_value: pipelineCache.impact_cached_value,
              impact_last_calculated: now.toISOString()
            })
            .eq('id', pipelineCache.id)

          if (updateError) {
            console.error(`[Impact API] Failed to update cache for pipeline ${pipelineCache.id}:`, updateError)
          }
        } catch (cacheError) {
          console.error(`[Impact API] Exception updating cache for pipeline ${pipelineCache.id}:`, cacheError)
        }
      }

      console.log('[Impact API] ✓ Cache updated successfully')
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        impacts,
      },
    })
  } catch (error) {
    console.error('[Impact API] Unexpected error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
