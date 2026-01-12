/**
 * Pipelines API
 * GET  /api/pipelines - List user's pipelines
 * POST /api/pipelines - Create new pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'
import type { Pipeline, CreatePipelineInput } from '@/lib/types/pipeline'
import {
  calculatePipelineRevenue,
  calculatePipelineRevenueWithDeliveryDays,
  getDefaultQuarterlyMonths,
} from '@/lib/services/pipelineCalculations'
import { autoSetProgressPercent } from '@/lib/services/statusProgressMapping'
import { syncPipelineToSheet } from '@/lib/services/pipelineSheetsSync'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user using custom JWT
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Get query params
    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group') // 'sales' | 'cs'

    // Pagination parameters
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor') // created_at timestamp for cursor-based pagination

    // Build query with monthly_forecasts join (limit to 3 months per quarter)
    // Use count: 'exact' to get total count for pagination
    // NOTE: Removed .eq('user_id', auth.userId) - all authenticated users can see all pipelines
    let query = supabase
      .from('pipelines')
      .select(`
        *,
        monthly_forecasts:pipeline_monthly_forecast(
          id,
          year,
          month,
          delivery_days,
          gross_revenue,
          net_revenue,
          validation_flag,
          notes
        ).order(month.asc).limit(3)
      `, { count: 'exact' })

    // Apply group filter if provided
    if (group && ['sales', 'cs'].includes(group)) {
      query = query.eq('group', group)
    }

    // Cursor-based pagination - fetch records BEFORE cursor (reverse chronological)
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    // Order and limit
    query = query
      .order('created_at', { ascending: false })
      .limit(limit)

    // Execute query
    const { data: pipelines, error, count } = await query

    if (error) {
      console.error('[Pipelines API] Error fetching pipelines:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pipelines' },
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const hasMore = pipelines && pipelines.length === limit
    const nextCursor = hasMore && pipelines.length > 0
      ? pipelines[pipelines.length - 1].created_at
      : null

    return NextResponse.json({
      data: pipelines,
      pagination: {
        total: count || 0,
        limit,
        hasMore,
        nextCursor,
      }
    })
  } catch (error) {
    console.error('[Pipelines API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pipelines - DISABLED
 *
 * Pipeline creation is now managed via Google Sheets sync.
 * Use the quarterly sheets workflow instead:
 * 1. Add pipeline to quarterly Google Sheet
 * 2. Trigger sync via webhook or manual sync button
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Pipeline creation is disabled',
      message: 'Pipelines are now managed via Google Sheets. Please add the pipeline to the appropriate quarterly sheet and sync.',
      documentation: '/pipelines/sheet-config'
    },
    { status: 403 }
  )
}
