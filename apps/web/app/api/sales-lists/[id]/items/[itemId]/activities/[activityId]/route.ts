/**
 * Individual Activity API
 *
 * Endpoints for managing a specific activity:
 * - PUT: Update an activity
 * - DELETE: Delete an activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../../../../lib/supabase/admin'
import { UpdateActivityInput } from '../../../../../../../../lib/types/salesLists'
import { updateActivitySchema, validateRequest } from '../../../../../../../../lib/validation/schemas'
import { withCsrfProtection } from '../../../../../../../../lib/middleware/csrf'

/**
 * PUT /api/sales-lists/[id]/items/[itemId]/activities/[activityId]
 * Update an activity (user can only update their own activities)
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; activityId: string } }
) {
  try {
    const { id: listId, itemId, activityId } = params

    // Get auth token from cookie
    const authToken = request.cookies.get('__Host-auth_token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 })
    }

    // Parse JWT to get user email
    let userEmail: string
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      userEmail = payload.sub || payload.email

      if (!userEmail) {
        throw new Error('No user email in token')
      }
    } catch (error) {
      console.error('[PUT activity] Invalid token:', error)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get user ID from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !user) {
      console.error('[PUT activity] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Verify activity exists and belongs to this user
    const { data: activity } = await supabase
      .from('sales_list_activities')
      .select('logged_by, list_item_id')
      .eq('id', activityId)
      .single()

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (activity.logged_by !== userId) {
      return NextResponse.json({ error: 'You can only edit your own activities' }, { status: 403 })
    }

    if (activity.list_item_id !== itemId) {
      return NextResponse.json({ error: 'Activity does not belong to this item' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(updateActivitySchema, body) as UpdateActivityInput

    // Update activity
    const updateData: any = {}
    if (validatedData.contact_time !== undefined) updateData.contact_time = validatedData.contact_time
    if (validatedData.response_time !== undefined) updateData.response_time = validatedData.response_time
    if (validatedData.contact_outcome !== undefined) updateData.contact_outcome = validatedData.contact_outcome
    if (validatedData.response_outcome !== undefined) updateData.response_outcome = validatedData.response_outcome
    if (validatedData.closed_status !== undefined) updateData.closed_status = validatedData.closed_status
    if (validatedData.deal_value !== undefined) updateData.deal_value = validatedData.deal_value
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.metadata !== undefined) updateData.metadata = validatedData.metadata

    const { data: updatedActivity, error: updateError } = await supabase
      .from('sales_list_activities')
      .update(updateData)
      .eq('id', activityId)
      .select(`
        *,
        user:users!logged_by(email, name)
      `)
      .single()

    if (updateError) {
      console.error('[PUT activity] Error updating activity:', updateError)
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }

    console.log('[PUT activity] Updated activity:', activityId)

    return NextResponse.json(updatedActivity)
  } catch (error) {
    console.error('[PUT activity] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sales-lists/[id]/items/[itemId]/activities/[activityId]
 * Delete an activity (user can only delete their own activities)
 */
async function deleteHandler(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; activityId: string } }
) {
  try {
    const { id: listId, itemId, activityId } = params

    // Get auth token from cookie
    const authToken = request.cookies.get('__Host-auth_token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 })
    }

    // Parse JWT to get user email
    let userEmail: string
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      userEmail = payload.sub || payload.email

      if (!userEmail) {
        throw new Error('No user email in token')
      }
    } catch (error) {
      console.error('[DELETE activity] Invalid token:', error)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get user ID from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !user) {
      console.error('[DELETE activity] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Verify activity exists and belongs to this user
    const { data: activity } = await supabase
      .from('sales_list_activities')
      .select('logged_by, list_item_id')
      .eq('id', activityId)
      .single()

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (activity.logged_by !== userId) {
      return NextResponse.json({ error: 'You can only delete your own activities' }, { status: 403 })
    }

    if (activity.list_item_id !== itemId) {
      return NextResponse.json({ error: 'Activity does not belong to this item' }, { status: 404 })
    }

    // Delete activity
    const { error: deleteError } = await supabase
      .from('sales_list_activities')
      .delete()
      .eq('id', activityId)

    if (deleteError) {
      console.error('[DELETE activity] Error deleting activity:', deleteError)
      return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 })
    }

    console.log('[DELETE activity] Deleted activity:', activityId)

    return NextResponse.json({ message: 'Activity deleted successfully' })
  } catch (error) {
    console.error('[DELETE activity] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withCsrfProtection(putHandler)
export const DELETE = withCsrfProtection(deleteHandler)
