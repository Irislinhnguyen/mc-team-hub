/**
 * Sales List Items API
 *
 * Endpoints for managing items in a sales list:
 * - GET: List all items in a list
 * - POST: Add items to a list (single or bulk)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { AddListItemInput } from '../../../../../lib/types/salesLists'
import { addListItemsSchema, validateRequest } from '../../../../../lib/validation/schemas'
import { withCsrfProtection } from '../../../../../lib/middleware/csrf'

/**
 * GET /api/sales-lists/[id]/items
 * Get all items in a list with summary data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id

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
      console.error('[GET items] Invalid token:', error)
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
      console.error('[GET items] User not found:', userError)
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

    // Fetch items with summary data
    const { data: items, error: itemsError } = await supabase
      .from('sales_list_items_summary')
      .select('*')
      .eq('list_id', listId)
      .order('added_at', { ascending: false })

    if (itemsError) {
      console.error('[GET items] Error fetching items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('[GET items] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sales-lists/[id]/items
 * Add items to a list (supports bulk)
 */
async function postHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id

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
      console.error('[POST items] Invalid token:', error)
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
      console.error('[POST items] User not found:', userError)
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(addListItemsSchema, body) as { items: AddListItemInput[] }

    // Prepare items for insertion
    const itemsToInsert = validatedData.items.map(item => ({
      list_id: listId,
      item_type: item.item_type,
      item_value: item.item_value,
      item_label: item.item_label || null,
      source: item.source || 'manual',
      metadata: item.metadata || {},
      added_by: userId,
    }))

    // Insert items (will skip duplicates due to unique constraint)
    const { data: insertedItems, error: insertError } = await supabase
      .from('sales_list_items')
      .insert(itemsToInsert)
      .select()

    if (insertError) {
      console.error('[POST items] Error inserting items:', insertError)

      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'One or more items already exist in this list' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Failed to add items' }, { status: 500 })
    }

    console.log('[POST items] Added items:', insertedItems?.length || 0)

    return NextResponse.json(
      {
        message: `Successfully added ${insertedItems?.length || 0} item(s)`,
        items: insertedItems,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST items] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfProtection(postHandler)
