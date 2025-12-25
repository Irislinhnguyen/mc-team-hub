/**
 * Pipeline Activities API
 * GET  /api/pipelines/[id]/activities - Get activity logs
 * POST /api/pipelines/[id]/activities - Add manual note
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'
import type { PipelineActivityLogWithUser } from '@/lib/types/pipeline'

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

    // Verify user owns the pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (pipelineError || !pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    if (pipeline.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to pipeline' },
        { status: 403 }
      )
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const activityType = searchParams.get('type') // Optional filter by activity_type

    // Fetch activities from view with user information
    let query = supabase
      .from('pipeline_activity_log_with_users')
      .select('*', { count: 'exact' })
      .eq('pipeline_id', id)
      .order('logged_at', { ascending: false })

    // Apply activity_type filter if provided
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    const { data: activities, error: activitiesError, count } = await query
      .range(offset, offset + limit - 1)

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      )
    }

    const total = count || 0
    const has_more = offset + limit < total

    return NextResponse.json({
      data: activities as PipelineActivityLogWithUser[],
      total,
      has_more,
    })
  } catch (error) {
    console.error('Error in GET /api/pipelines/[id]/activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    // Verify user owns the pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (pipelineError || !pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    if (pipeline.user_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to pipeline' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate notes field
    if (!body.notes || typeof body.notes !== 'string' || !body.notes.trim()) {
      return NextResponse.json(
        { error: 'Notes field is required and must be non-empty' },
        { status: 400 }
      )
    }

    // Insert activity log entry
    const { data: activity, error: insertError } = await supabase
      .from('pipeline_activity_log')
      .insert({
        pipeline_id: id,
        activity_type: 'note',
        notes: body.notes.trim(),
        logged_by: auth.userId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting activity log:', insertError)
      return NextResponse.json(
        { error: 'Failed to add note' },
        { status: 500 }
      )
    }

    // Fetch the enriched activity with user info
    const { data: enrichedActivity } = await supabase
      .from('pipeline_activity_log_with_users')
      .select('*')
      .eq('id', activity.id)
      .single()

    return NextResponse.json({
      data: enrichedActivity as PipelineActivityLogWithUser,
      message: 'Note added successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/pipelines/[id]/activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
