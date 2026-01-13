/**
 * Focus of Month - Filter Pipelines API
 * POST - Execute BigQuery with advanced filters to return pipeline candidates
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { buildWhereClause } from '@/lib/services/analyticsQueries'
import BigQueryService from '@/lib/services/bigquery'
import { createClient } from '@/lib/supabase/server'
import type { SimplifiedFilter } from '@/lib/types/performanceTracker'

// =====================================================
// Types
// =====================================================

interface FilterPipelinesRequest {
  filters?: Record<string, any>
  simplifiedFilter?: SimplifiedFilter
  dateRange: {
    startDate: string // YYYY-MM-DD
    endDate: string
  }
  focusId?: string // Optional: for duplicate detection
  targetedProduct?: string // Optional: the product being targeted (e.g., "flexiblesticky")
  team?: string      // Optional: team filter
  pic?: string       // Optional: PIC filter
}

interface FilterPipelineResult {
  pid: number
  pubname: string
  mid: number
  medianame: string
  pic: string
  targeted_product: string // The product being targeted (single value)
  rev_p1: number
  req_p1: number
  paid_p1: number
  ecpm_p1: number
  already_in_focus: boolean
  has_active_pipeline: boolean
}

// =====================================================
// POST - Filter Pipelines
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: FilterPipelinesRequest = await request.json()
    const {
      filters = {},
      simplifiedFilter,
      dateRange,
      focusId,
      targetedProduct,
      team,
      pic,
    } = body

    // 🔧 Convert team display name to ID (e.g., "Web GV" → "WEB_GV")
    // This is needed because the frontend sends display names but database uses IDs
    const TEAM_LABEL_TO_ID_MAP: Record<string, string> = {
      'Web GTI': 'WEB_GTI',
      'Web GV': 'WEB_GV',
      'App': 'APP'
    }

    const normalizedTeam = team ? (TEAM_LABEL_TO_ID_MAP[team] || team) : null

    if (normalizedTeam && normalizedTeam !== team) {
      console.log('[FilterPipelines] 🔧 Auto-converted team label:', team, '→', normalizedTeam)
    }

    // Handle team filter: get PICs for this team from Supabase
    if (normalizedTeam) {
      console.log('[FilterPipelines] 🏢 Fetching PICs for team:', normalizedTeam)

      const teamConfigResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/focus-of-month/metadata/team-pics?team=${normalizedTeam}`,
        {
          headers: {
            Authorization: request.headers.get('authorization') || '',
          },
        }
      )

      if (teamConfigResponse.ok) {
        const teamData = await teamConfigResponse.json()
        if (teamData.status === 'ok' && teamData.data && teamData.data.length > 0) {
          // Add PICs from team to filters (use 'pic' key for buildWhereClause)
          console.log('[FilterPipelines] ✅ Found', teamData.data.length, 'PICs for team:', normalizedTeam)
          filters.pic = teamData.data
        } else {
          console.warn('[FilterPipelines] ⚠️  No PICs found for team:', normalizedTeam)
        }
      } else {
        console.error('[FilterPipelines] ❌ Team-pics API failed:', teamConfigResponse.status)
      }
    }

    // Add individual pic filter if provided (will override team PICs if both set)
    if (pic) {
      console.log('[FilterPipelines] 👤 Individual PIC filter:', pic)
      filters.pic = pic
    }

    // Remove team from filters before passing to buildWhereClause
    // since we've already converted it to PICs above
    delete filters.team

    // Validate date range
    if (!dateRange?.startDate || !dateRange?.endDate) {
      return NextResponse.json(
        { status: 'error', message: 'Date range is required' },
        { status: 400 }
      )
    }

    // Build WHERE clause from filters
    const whereClause = await buildWhereClause(filters, {
      skipDateFilter: true, // We'll add date filter manually
      skipRevFlagFilter: true,
      simplifiedFilter,
    })

    // Remove leading "WHERE" if present
    const conditions = whereClause.replace(/^WHERE\s+/i, '')

    // Build default condition: exclude MIDs that already have the targeted product
    // This is ALWAYS applied when targetedProduct is set
    let defaultCondition = ''
    if (targetedProduct) {
      defaultCondition = `
        mid NOT IN (
          SELECT DISTINCT mid
          FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
          WHERE product = '${targetedProduct}'
            AND DATE BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
        )
      `
    }

    // Build BigQuery SQL
    // Combines: date filter + default condition (exclude MIDs with targeted product) + user filters
    const sql = `
      SELECT
        pid,
        pubname,
        mid,
        medianame,
        pic,
        '${targetedProduct || ''}' as targeted_product,
        SUM(rev) as rev_p1,
        SUM(req) as req_p1,
        SUM(paid) as paid_p1,
        SAFE_DIVIDE(SUM(rev) * 1000, NULLIF(SUM(paid), 0)) as ecpm_p1
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
        ${defaultCondition ? `AND ${defaultCondition}` : ''}
        ${conditions ? `AND (${conditions})` : ''}
      GROUP BY pid, pubname, mid, medianame, pic
      ORDER BY rev_p1 DESC
    `

    console.log('[filter-pipelines] Executing SQL:', sql)

    // Execute BigQuery query
    const results = await BigQueryService.executeQuery(sql)

    // Post-process: Check for duplicates and active pipelines
    const supabase = await createClient()

    // Get existing MIDs in this Focus (if focusId provided)
    // If targetedProduct is specified, also check if the MID already has this product
    let existingMids = new Set<string>()
    if (focusId) {
      const { data: existingSuggestions } = await supabase
        .from('focus_suggestions')
        .select('mid, product')
        .eq('focus_id', focusId)

      if (existingSuggestions) {
        // If targetedProduct is specified, only mark as duplicate if it has the same product
        // Otherwise, mark all as duplicates
        if (targetedProduct) {
          existingMids = new Set(
            existingSuggestions
              .filter((s) => s.product === targetedProduct)
              .map((s) => s.mid)
          )
        } else {
          existingMids = new Set(existingSuggestions.map((s) => s.mid))
        }
      }
    }

    // Get active pipelines
    const midsInResults = results.map((r: any) => r.mid.toString())
    const { data: activePipelines } = await supabase
      .from('pipelines')
      .select('mid, product')
      .in('mid', midsInResults)
      .not('status', 'in', '(【Z】)')

    // Create lookup map for active pipelines
    const pipelineLookup = new Map<string, boolean>()
    if (activePipelines) {
      activePipelines.forEach((p) => {
        pipelineLookup.set(`${p.mid}_${p.product}`, true)
      })
    }

    // Mark duplicates and pipeline status
    const enrichedResults: FilterPipelineResult[] = results.map((result: any) => ({
      pid: result.pid,
      pubname: result.pubname || '',
      mid: result.mid,
      medianame: result.medianame || '',
      pic: result.pic || '',
      targeted_product: result.targeted_product || '',
      rev_p1: result.rev_p1 || 0,
      req_p1: result.req_p1 || 0,
      paid_p1: result.paid_p1 || 0,
      ecpm_p1: result.ecpm_p1 || 0,
      already_in_focus: existingMids.has(result.mid.toString()),
      has_active_pipeline: targetedProduct
        ? pipelineLookup.has(`${result.mid}_${targetedProduct}`) || false
        : false,
    }))

    return NextResponse.json({
      status: 'ok',
      data: enrichedResults,
      total: enrichedResults.length,
      message: undefined,
    })
  } catch (error) {
    console.error('[filter-pipelines] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to filter pipelines',
      },
      { status: 500 }
    )
  }
}
