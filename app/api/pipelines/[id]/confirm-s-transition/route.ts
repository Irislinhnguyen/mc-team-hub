/**
 * S- to S Transition Confirmation API
 * POST /api/pipelines/[id]/confirm-s-transition
 *
 * Confirms or declines S- to S transition with manual date logging.
 * Sets close_won_date to TODAY (actual confirmation date), not projected date.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'

interface ConfirmRequestBody {
  action: 'confirm' | 'decline'
  notes?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate user
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body: ConfirmRequestBody = await request.json()

    // Validate action
    if (!['confirm', 'decline'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "confirm" or "decline"' },
        { status: 400 }
      )
    }

    // Fetch existing pipeline
    const { data: pipeline, error: fetchError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    // Validate pipeline is in S- status
    if (pipeline.status !== '【S-】') {
      return NextResponse.json(
        { error: 'Pipeline must be in S- status to confirm transition' },
        { status: 400 }
      )
    }

    // Validate actual_starting_date exists
    if (!pipeline.actual_starting_date) {
      return NextResponse.json(
        { error: 'Pipeline missing actual_starting_date. Please set it first.' },
        { status: 400 }
      )
    }

    // Check if at least 7 days have passed
    const startDate = new Date(pipeline.actual_starting_date)
    const today = new Date()
    const daysPassed = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysPassed < 7) {
      return NextResponse.json(
        {
          error: `Only ${daysPassed} days have passed since distribution started. Must wait 7 days.`,
          days_remaining: 7 - daysPassed
        },
        { status: 400 }
      )
    }

    // Build update based on action
    const updateData: any = {
      updated_by: auth.userId
    }

    if (body.action === 'confirm') {
      // CONFIRM: Move to S, set close_won_date to TODAY (actual date!)
      updateData.status = '【S】'
      updateData.close_won_date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      updateData.s_confirmation_status = 'confirmed'
      updateData.s_confirmed_at = new Date().toISOString()
      if (body.notes) {
        updateData.s_confirmation_notes = body.notes.trim()
      }

    } else if (body.action === 'decline') {
      // DECLINE: Stay in S-, mark as declined
      updateData.s_confirmation_status = 'declined'
      updateData.s_declined_at = new Date().toISOString()
      if (body.notes) {
        updateData.s_confirmation_notes = body.notes.trim()
      }
    }

    // Update pipeline
    const { data: updatedPipeline, error: updateError } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Confirm S Transition API] Error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update pipeline' },
        { status: 500 }
      )
    }

    // Log activity
    const activityType = body.action === 'confirm' ? 'status_change' : 'field_update'
    const activityNotes = body.action === 'confirm'
      ? `S- to S transition confirmed. Close won date set to ${updateData.close_won_date}`
      : `S- to S transition declined. Pipeline remains in S- status.`

    await supabase
      .from('pipeline_activity_log')
      .insert({
        pipeline_id: id,
        activity_type: activityType,
        field_changed: body.action === 'confirm' ? 'status' : 's_confirmation_status',
        old_value: body.action === 'confirm' ? '【S-】' : pipeline.s_confirmation_status,
        new_value: body.action === 'confirm' ? '【S】' : 'declined',
        notes: activityNotes + (body.notes ? ` - User notes: ${body.notes}` : ''),
        logged_by: auth.userId
      })

    return NextResponse.json({
      data: updatedPipeline,
      message: body.action === 'confirm'
        ? 'Pipeline confirmed and moved to S status'
        : 'Confirmation declined. Pipeline remains in S- status.'
    })

  } catch (error) {
    console.error('[Confirm S Transition API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
