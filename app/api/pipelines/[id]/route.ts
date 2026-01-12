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

/**
 * PUT /api/pipelines/[id] - DISABLED
 *
 * Pipeline editing is now managed via Google Sheets sync.
 * Use the quarterly sheets workflow instead:
 * 1. Edit pipeline in quarterly Google Sheet
 * 2. Changes sync automatically via webhook
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      error: 'Pipeline editing is disabled',
      message: 'Pipelines are now managed via Google Sheets. Please edit the pipeline in the appropriate quarterly sheet.',
      documentation: '/pipelines/sheet-config'
    },
    { status: 403 }
  )
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
