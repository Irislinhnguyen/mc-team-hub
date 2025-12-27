/**
 * Pipeline Detail API
 * GET    /api/pipelines/[id] - Get pipeline details
 * PUT    /api/pipelines/[id] - Update pipeline
 * DELETE /api/pipelines/[id] - Delete pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'
import type { UpdatePipelineInput } from '@/lib/types/pipeline'
import {
  calculatePipelineRevenue,
  calculatePipelineRevenueWithDeliveryDays,
} from '@/lib/services/pipelineCalculations'
import { autoSetProgressPercent } from '@/lib/services/statusProgressMapping'
import { detectChangedFields } from '@/lib/utils/pipelineActivityDetector'
import { syncPipelineToSheet, deleteRowFromSheet } from '@/lib/services/pipelineSheetsSync'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate user using custom JWT
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Fetch pipeline with monthly_forecasts join (limit to 3 months per quarter)
    const { data: pipeline, error } = await supabase
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
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pipeline not found' },
          { status: 404 }
        )
      }

      console.error('[Pipeline Detail API] Error fetching pipeline:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pipeline' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: pipeline })
  } catch (error) {
    console.error('[Pipeline Detail API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate user using custom JWT
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    const body: UpdatePipelineInput = await request.json()

    // Fetch existing pipeline to check for changes
    const { data: existing, error: fetchError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    // ===== VALIDATE REQUIRED FIELDS =====
    // Ensure proposal_date is set (either existing or in update)
    if (!existing.proposal_date && !body.proposal_date) {
      return NextResponse.json(
        { error: 'proposal_date is required' },
        { status: 400 }
      )
    }

    // Ensure starting_date (projection) is set (either existing or in update)
    if (!existing.starting_date && !body.starting_date) {
      return NextResponse.json(
        { error: 'starting_date (projection) is required' },
        { status: 400 }
      )
    }

    // Validate revenue_share if provided
    if (body.revenue_share !== null && body.revenue_share !== undefined) {
      if (body.revenue_share < 0 || body.revenue_share > 100) {
        return NextResponse.json(
          { error: 'Revenue share must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Calculate max_gross from imp and ecpm if they changed
    let calculated_max_gross = body.max_gross ?? existing.max_gross
    if ((body.imp !== undefined || body.ecpm !== undefined) && !body.max_gross) {
      const imp = body.imp ?? existing.imp
      const ecpm = body.ecpm ?? existing.ecpm
      if (imp && ecpm) {
        calculated_max_gross = (imp / 1000) * ecpm
      }
    }

    // Check if any calculation inputs changed
    const needsRecalculation =
      body.max_gross !== undefined ||
      body.imp !== undefined ||
      body.ecpm !== undefined ||
      body.revenue_share !== undefined ||
      body.status !== undefined ||
      body.starting_date !== undefined ||
      body.end_date !== undefined

    let calculatedValues = null

    // Recalculate if needed
    if (needsRecalculation) {
      // Auto-set progress_percent based on status (matches Google Sheet VLOOKUP)
      const status = (body.status ?? existing.status) as any
      const progress_percent = autoSetProgressPercent(status)

      // Always use enhanced calculator that auto-generates exactly 3 months for fiscal quarter
      const starting_date = body.starting_date ?? existing.starting_date
      const end_date = body.end_date ?? existing.end_date

      calculatedValues = calculatePipelineRevenueWithDeliveryDays({
        max_gross: calculated_max_gross,
        revenue_share: body.revenue_share ?? existing.revenue_share,
        status: status,
        progress_percent: progress_percent,
        starting_date: starting_date,
        end_date: end_date,
        fiscal_year: body.fiscal_year ?? existing.fiscal_year,
        fiscal_quarter: body.fiscal_quarter ?? existing.fiscal_quarter,
      })
    }

    // Build update object (only include provided fields)
    const updateData: any = {}

    // Metadata fields
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null
    if (body.fiscal_year !== undefined)
      updateData.fiscal_year = body.fiscal_year
    if (body.fiscal_quarter !== undefined)
      updateData.fiscal_quarter = body.fiscal_quarter
    if (body.group !== undefined) updateData.group = body.group

    // Required fields
    if (body.publisher !== undefined) updateData.publisher = body.publisher.trim()
    if (body.poc !== undefined) updateData.poc = body.poc.trim()

    // Optional basic info
    if (body.classification !== undefined)
      updateData.classification = body.classification?.trim() || null
    if (body.team !== undefined) updateData.team = body.team?.trim() || null
    if (body.pid !== undefined) updateData.pid = body.pid?.trim() || null
    if (body.mid !== undefined) updateData.mid = body.mid?.trim() || null
    if (body.domain !== undefined) updateData.domain = body.domain?.trim() || null
    if (body.channel !== undefined)
      updateData.channel = body.channel?.trim() || null
    if (body.region !== undefined) updateData.region = body.region?.trim() || null
    if (body.product !== undefined)
      updateData.product = body.product?.trim() || null

    // Revenue INPUT fields
    if (body.imp !== undefined) updateData.imp = body.imp
    if (body.ecpm !== undefined) updateData.ecpm = body.ecpm
    if (body.max_gross !== undefined || calculated_max_gross !== existing.max_gross) {
      updateData.max_gross = calculated_max_gross
    }
    if (body.revenue_share !== undefined)
      updateData.revenue_share = body.revenue_share

    // Revenue CALCULATED fields (use calculated values if recalculation happened)
    if (calculatedValues) {
      updateData.day_gross = calculatedValues.day_gross
      updateData.day_net_rev = calculatedValues.day_net_rev
      updateData.q_gross = calculatedValues.q_gross
      updateData.q_net_rev = calculatedValues.q_net_rev
      updateData.metadata = {
        ...existing.metadata,
        ...calculatedValues.metadata,
      }
    }

    // Status & timeline
    if (body.status !== undefined) {
      updateData.status = body.status
      // Auto-set progress_percent based on status (matches Google Sheet VLOOKUP)
      updateData.progress_percent = autoSetProgressPercent(body.status as any)
    }
    if (body.starting_date !== undefined)
      updateData.starting_date = body.starting_date
    if (body.end_date !== undefined)
      updateData.end_date = body.end_date
    if (body.proposal_date !== undefined)
      updateData.proposal_date = body.proposal_date
    if (body.interested_date !== undefined)
      updateData.interested_date = body.interested_date
    if (body.acceptance_date !== undefined)
      updateData.acceptance_date = body.acceptance_date

    // Action tracking
    if (body.action_date !== undefined) updateData.action_date = body.action_date
    if (body.next_action !== undefined)
      updateData.next_action = body.next_action?.trim() || null
    if (body.action_detail !== undefined)
      updateData.action_detail = body.action_detail?.trim() || null
    if (body.action_progress !== undefined)
      updateData.action_progress = body.action_progress?.trim() || null

    // Forecast type
    if (body.forecast_type !== undefined)
      updateData.forecast_type = body.forecast_type

    // Other
    if (body.competitors !== undefined)
      updateData.competitors = body.competitors?.trim() || null

    // Manual metadata update (if not already set by calculated values)
    if (body.metadata !== undefined && !calculatedValues) {
      updateData.metadata = body.metadata
    }

    // Always update updated_by
    updateData.updated_by = auth.userId

    // Update pipeline (include monthly_forecasts in response)
    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', id)
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
        )
      `)
      .single()

    if (error) {
      console.error('[Pipeline Detail API] Error updating pipeline:', error)

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A pipeline with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update pipeline' },
        { status: 500 }
      )
    }

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    // Log status transition (trigger will handle date auto-logging)
    if (body.status !== undefined && body.status !== existing.status) {
      console.log(
        `[Pipeline API] Status transition: ${existing.status} → ${body.status}`
      )
    }

    // Log field changes to activity log (skip status - handled by DB trigger)
    try {
      const changedFields = detectChangedFields(existing, updateData)

      if (changedFields.length > 0) {
        // Insert activity log entries for changed fields
        const activityLogs = changedFields.map((change) => ({
          pipeline_id: id,
          activity_type: change.activityType,
          field_changed: change.field,
          old_value: change.oldValue,
          new_value: change.newValue,
          logged_by: auth.userId,
        }))

        const { error: logError } = await supabase
          .from('pipeline_activity_log')
          .insert(activityLogs)

        if (logError) {
          console.error('[Pipeline Detail API] Error logging activities:', logError)
          // Don't fail the request if logging fails
        }
      }
    } catch (logError) {
      console.error('[Pipeline Detail API] Failed to log activities:', logError)
      // Don't fail the request if logging fails
    }

    // Update monthly forecasts if recalculation happened
    if (calculatedValues && calculatedValues.monthly_forecasts.length > 0) {
      // Delete existing forecasts
      await supabase
        .from('pipeline_monthly_forecast')
        .delete()
        .eq('pipeline_id', id)

      // Insert new calculated forecasts
      const { error: forecastError } = await supabase
        .from('pipeline_monthly_forecast')
        .insert(
          calculatedValues.monthly_forecasts.map((forecast) => ({
            pipeline_id: id,
            year: forecast.year,
            month: forecast.month,
            delivery_days: forecast.delivery_days,
            gross_revenue: forecast.gross_revenue,
            net_revenue: forecast.net_revenue,
          }))
        )

      if (forecastError) {
        console.error(
          '[Pipeline Detail API] Error updating monthly forecasts:',
          forecastError
        )
        // Note: Pipeline was updated, but forecasts failed
      }
    }

    // Sync to Google Sheets (non-blocking error handling)
    try {
      // Check if status changed to 【S】 (closed won) - delete from sheet instead of sync
      const previousStatus = existing.status
      const newStatus = pipeline.status

      if (newStatus === '【S】' && previousStatus !== '【S】') {
        // Delete row from Google Sheets when pipeline reaches S status
        console.log(`[Pipeline Detail API] Status changed to 【S】 - deleting from sheet`)
        const deleteResult = await deleteRowFromSheet(pipeline.id, pipeline.group)
        if (!deleteResult.success) {
          console.warn('[Pipeline Detail API] Sheet row delete failed:', deleteResult.error)
        }
      } else {
        // Normal sync for non-S status
        const syncResult = await syncPipelineToSheet(pipeline)
        if (!syncResult.success) {
          console.warn('[Pipeline Detail API] Sheet sync failed:', syncResult.error)
          // Don't fail the request - pipeline already updated
        }
      }
    } catch (syncError) {
      console.error('[Pipeline Detail API] Unexpected sync error:', syncError)
      // Continue - don't block user workflow
    }

    return NextResponse.json({
      data: pipeline,
      message: 'Pipeline updated successfully',
    })
  } catch (error) {
    console.error('[Pipeline Detail API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate user using custom JWT
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // First, fetch pipeline data (need group for sheet sync)
    const { data: pipeline, error: fetchError } = await supabase
      .from('pipelines')
      .select('id, group')
      .eq('id', id)
      .single()

    if (fetchError || !pipeline) {
      console.error('[Pipeline Detail API] Error fetching pipeline:', fetchError)
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    // Delete pipeline (cascade will delete forecasts and activities)
    // NOTE: RLS policy will enforce only owner/admin can delete
    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Pipeline Detail API] Error deleting pipeline:', error)
      return NextResponse.json(
        { error: 'Failed to delete pipeline' },
        { status: 500 }
      )
    }

    // Sync deletion to Google Sheets (non-blocking)
    try {
      await deleteRowFromSheet(pipeline.id, pipeline.group)
    } catch (syncError) {
      // Don't fail the request if sheet sync fails
      console.error('[Pipeline Detail API] Failed to delete from sheet:', syncError)
    }

    return NextResponse.json({
      message: 'Pipeline deleted successfully',
    })
  } catch (error) {
    console.error('[Pipeline Detail API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
