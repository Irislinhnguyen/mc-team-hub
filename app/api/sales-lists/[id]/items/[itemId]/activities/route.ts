/**
 * Sales List Item Activities API
 *
 * Endpoints for managing activities (contact logs) for a list item:
 * - GET: List all activities for an item
 * - POST: Log a new activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { LogActivityInput } from '../../../../../../../lib/types/salesLists'
import { logActivitySchema, validateRequest } from '../../../../../../../lib/validation/schemas'
import { withCsrfProtection } from '../../../../../../../lib/middleware/csrf'

/**
 * GET /api/sales-lists/[id]/items/[itemId]/activities
 * Get all activities for a list item (timeline)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id: listId, itemId } = params

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
      console.error('[GET activities] Invalid token:', error)
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
      console.error('[GET activities] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Verify user has access to this list
    const { data: list } = await supabase
      .from('sales_lists')
      .select('user_id')
      .eq('id', listId)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const isOwner = list.user_id === userId

    if (!isOwner) {
      const { data: share } = await supabase
        .from('sales_list_shares')
        .select('permission')
        .eq('list_id', listId)
        .eq('shared_with_user_id', userId)
        .single()

      if (!share) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Verify item belongs to this list
    const { data: item } = await supabase
      .from('sales_list_items')
      .select('list_id')
      .eq('id', itemId)
      .single()

    if (!item || item.list_id !== listId) {
      return NextResponse.json({ error: 'Item not found in this list' }, { status: 404 })
    }

    // Fetch activities with user info
    const { data: activities, error: activitiesError } = await supabase
      .from('sales_list_activities')
      .select(`
        *,
        user:users!logged_by(email, name)
      `)
      .eq('list_item_id', itemId)
      .order('contact_time', { ascending: false })

    if (activitiesError) {
      console.error('[GET activities] Error fetching activities:', activitiesError)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (error) {
    console.error('[GET activities] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sales-lists/[id]/items/[itemId]/activities
 * Log a new activity for a list item
 */
async function postHandler(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id: listId, itemId } = params

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
      console.error('[POST activity] Invalid token:', error)
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
      console.error('[POST activity] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Verify user has edit access to this list
    const { data: list } = await supabase
      .from('sales_lists')
      .select('user_id')
      .eq('id', listId)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const isOwner = list.user_id === userId
    let hasEditAccess = isOwner

    if (!isOwner) {
      const { data: share } = await supabase
        .from('sales_list_shares')
        .select('permission')
        .eq('list_id', listId)
        .eq('shared_with_user_id', userId)
        .single()

      hasEditAccess = share?.permission === 'edit'
    }

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Edit permission required' }, { status: 403 })
    }

    // Verify item belongs to this list
    const { data: item } = await supabase
      .from('sales_list_items')
      .select('list_id')
      .eq('id', itemId)
      .single()

    if (!item || item.list_id !== listId) {
      return NextResponse.json({ error: 'Item not found in this list' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()

    // Override list_item_id from URL
    const activityData = {
      ...body,
      list_item_id: itemId,
    }

    const validatedData = validateRequest(logActivitySchema, activityData) as LogActivityInput

    // Prepare activity for insertion
    const activityToInsert: any = {
      list_item_id: itemId,
      activity_type: validatedData.activity_type,
      contact_time: validatedData.contact_time || new Date().toISOString(),
      response_time: validatedData.response_time || null,
      contact_outcome: validatedData.contact_outcome || null,
      response_outcome: validatedData.response_outcome || null,
      closed_status: validatedData.closed_status || null,
      deal_value: validatedData.deal_value || null,
      notes: validatedData.notes || null,
      metadata: validatedData.metadata || {},
      logged_by: userId,
    }

    // Insert activity
    const { data: insertedActivity, error: insertError } = await supabase
      .from('sales_list_activities')
      .insert(activityToInsert)
      .select(`
        *,
        user:users!logged_by(email, name)
      `)
      .single()

    if (insertError) {
      console.error('[POST activity] Error inserting activity:', insertError)
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }

    console.log('[POST activity] Logged activity:', insertedActivity.id)

    return NextResponse.json(insertedActivity, { status: 201 })
  } catch (error) {
    console.error('[POST activity] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfProtection(postHandler)
