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
      .eq('user_id', auth.userId)

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using custom JWT
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    const body: CreatePipelineInput = await request.json()

    // Validate required fields
    if (!body.publisher || body.publisher.trim() === '') {
      return NextResponse.json(
        { error: 'Publisher is required' },
        { status: 400 }
      )
    }

    if (!body.poc || body.poc.trim() === '') {
      return NextResponse.json({ error: 'POC is required' }, { status: 400 })
    }

    if (!body.group || !['sales', 'cs'].includes(body.group)) {
      return NextResponse.json(
        { error: 'Valid group (sales/cs) is required' },
        { status: 400 }
      )
    }

    // Auto-generate name from publisher if not provided
    const pipelineName = body.name?.trim() || body.publisher.trim()

    // Validate revenue_share if provided
    if (body.revenue_share !== null && body.revenue_share !== undefined) {
      if (body.revenue_share < 0 || body.revenue_share > 100) {
        return NextResponse.json(
          { error: 'Revenue share must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Calculate max_gross from imp and ecpm if available
    let calculated_max_gross = body.max_gross || null
    if (!calculated_max_gross && body.imp && body.ecpm) {
      calculated_max_gross = (body.imp / 1000) * body.ecpm
    }

    // Auto-set progress_percent based on status (matches Google Sheet VLOOKUP)
    const status = (body.status as any) || '【E】'
    const progress_percent = autoSetProgressPercent(status)

    // Calculate revenue fields using Google Sheet formulas WITH auto-calculated delivery_days
    // If user provides starting_date and end_date, use enhanced calculator
    // Otherwise, fall back to manual monthly_forecasts input
    let calculated
    if (body.starting_date || body.end_date) {
      // Use enhanced calculator that auto-calculates delivery_days
      calculated = calculatePipelineRevenueWithDeliveryDays({
        max_gross: calculated_max_gross,
        revenue_share: body.revenue_share || null,
        status: status,
        progress_percent: progress_percent,
        starting_date: body.starting_date || null,
        end_date: body.end_date || null,
        fiscal_year: body.fiscal_year,
        fiscal_quarter: body.fiscal_quarter,
      })
    } else {
      // Fall back to manual monthly_forecasts input (backward compatibility)
      const monthlyInputs = body.monthly_forecasts || getDefaultQuarterlyMonths()
      calculated = calculatePipelineRevenue({
        max_gross: calculated_max_gross,
        revenue_share: body.revenue_share || null,
        status: status,
        progress_percent: progress_percent,
        monthly_forecasts: monthlyInputs,
      })
    }

    // Create pipeline with CALCULATED revenue fields
    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .insert({
        user_id: auth.userId,
        name: pipelineName,
        description: body.description?.trim() || null,
        fiscal_year: body.fiscal_year || new Date().getFullYear(),
        fiscal_quarter: body.fiscal_quarter || null,
        group: body.group,

        // Required fields
        publisher: body.publisher.trim(),
        poc: body.poc.trim(),

        // Optional fields
        classification: body.classification?.trim() || null,
        team: body.team?.trim() || null,
        pid: body.pid?.trim() || null,
        mid: body.mid?.trim() || null,
        domain: body.domain?.trim() || null,
        channel: body.channel?.trim() || null,
        region: body.region?.trim() || null,
        product: body.product?.trim() || null,

        // Revenue INPUT fields
        imp: body.imp || null,
        ecpm: body.ecpm || null,
        max_gross: calculated_max_gross,
        revenue_share: body.revenue_share || null,

        // Revenue CALCULATED fields (auto-computed)
        day_gross: calculated.day_gross,
        day_net_rev: calculated.day_net_rev,
        q_gross: calculated.q_gross,
        q_net_rev: calculated.q_net_rev,

        // Status & timeline
        status: status,
        progress_percent: progress_percent,
        starting_date: body.starting_date || null,
        end_date: body.end_date || null,
        proposal_date: body.proposal_date || null,
        interested_date: body.interested_date || null,
        acceptance_date: body.acceptance_date || null,

        // Action tracking
        action_date: body.action_date || null,
        next_action: body.next_action?.trim() || null,
        action_detail: body.action_detail?.trim() || null,
        action_progress: body.action_progress?.trim() || null,

        // Forecast type
        forecast_type: body.forecast_type || 'estimate',

        // Other
        competitors: body.competitors?.trim() || null,

        // Metadata with calculated quarterly_breakdown
        metadata: {
          ...(body.metadata || {}),
          ...calculated.metadata,
        },

        // Audit fields
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select()
      .single()

    if (error) {
      console.error('[Pipelines API] Error creating pipeline:', error)

      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A pipeline with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create pipeline' },
        { status: 500 }
      )
    }

    // Insert monthly forecasts with calculated revenue
    if (calculated.monthly_forecasts.length > 0) {
      const { error: forecastError } = await supabase
        .from('pipeline_monthly_forecast')
        .insert(
          calculated.monthly_forecasts.map((forecast) => ({
            pipeline_id: pipeline.id,
            year: forecast.year,
            month: forecast.month,
            delivery_days: forecast.delivery_days,
            gross_revenue: forecast.gross_revenue,
            net_revenue: forecast.net_revenue,
          }))
        )

      if (forecastError) {
        console.error(
          '[Pipelines API] Error creating monthly forecasts:',
          forecastError
        )
        // Note: Pipeline was created, but forecasts failed
        // Could delete pipeline and rollback, or just log the error
      }
    }

    // Sync to Google Sheets (fire-and-forget, non-blocking)
    // Sheets will update within 1-2 seconds
    // Performance: 1300ms → 300ms (4x faster)
    syncPipelineToSheet(pipeline).catch((syncError) => {
      console.error('[Pipelines API] Background sheet sync failed:', {
        pipelineId: pipeline.id,
        publisher: pipeline.publisher,
        error: syncError.message || String(syncError),
        timestamp: new Date().toISOString()
      })
      // Log to monitoring service if available
      // e.g., Sentry.captureException(syncError)
    })

    return NextResponse.json(
      {
        data: pipeline,
        message: 'Pipeline created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Pipelines API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
