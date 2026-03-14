/**
 * Individual Sales List API
 *
 * Endpoints for managing a specific sales list:
 * - GET: Get list details with items
 * - PUT: Update list details
 * - DELETE: Delete list
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { UpdateSalesListInput } from '../../../../lib/types/salesLists'
import { updateSalesListSchema, validateRequest } from '../../../../lib/validation/schemas'
import { withCsrfProtection } from '../../../../lib/middleware/csrf'

/**
 * GET /api/sales-lists/[id]
 * Get a specific sales list with its items
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
      console.error('[GET sales-lists/:id] Invalid token:', error)
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
      console.error('[GET sales-lists/:id] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Fetch list (RLS will ensure user has access)
    const { data: list, error: listError } = await supabase
      .from('sales_lists')
      .select('*')
      .eq('id', listId)
      .single()

    if (listError || !list) {
      console.error('[GET sales-lists/:id] List not found:', listError)
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Check if user has access (own list or shared)
    const isOwner = list.user_id === userId
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: share } = await supabase
        .from('sales_list_shares')
        .select('permission')
        .eq('list_id', listId)
        .eq('shared_with_user_id', userId)
        .single()

      hasAccess = !!share
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch items summary
    const { data: items, error: itemsError } = await supabase
      .from('sales_list_items_summary')
      .select('*')
      .eq('list_id', listId)
      .order('added_at', { ascending: false })

    if (itemsError) {
      console.error('[GET sales-lists/:id] Error fetching items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    const response = {
      ...list,
      items: items || [],
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GET sales-lists/:id] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sales-lists/[id]
 * Update a sales list
 */
async function putHandler(
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
      console.error('[PUT sales-lists/:id] Invalid token:', error)
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
      console.error('[PUT sales-lists/:id] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Check if list exists and user has permission
    const { data: list, error: listError } = await supabase
      .from('sales_lists')
      .select('user_id')
      .eq('id', listId)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Only owner can update list details
    if (list.user_id !== userId) {
      return NextResponse.json({ error: 'Only list owner can update list details' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(updateSalesListSchema, body) as UpdateSalesListInput

    // Update list
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.color !== undefined) updateData.color = validatedData.color

    const { data: updatedList, error: updateError } = await supabase
      .from('sales_lists')
      .update(updateData)
      .eq('id', listId)
      .select()
      .single()

    if (updateError) {
      console.error('[PUT sales-lists/:id] Error updating list:', updateError)

      // Check for unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A list with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
    }

    console.log('[PUT sales-lists/:id] Updated list:', listId)

    return NextResponse.json(updatedList)
  } catch (error) {
    console.error('[PUT sales-lists/:id] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sales-lists/[id]
 * Delete a sales list
 */
async function deleteHandler(
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
      console.error('[DELETE sales-lists/:id] Invalid token:', error)
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
      console.error('[DELETE sales-lists/:id] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Check if list exists and user is the owner
    const { data: list, error: listError } = await supabase
      .from('sales_lists')
      .select('user_id')
      .eq('id', listId)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Only owner can delete list
    if (list.user_id !== userId) {
      return NextResponse.json({ error: 'Only list owner can delete list' }, { status: 403 })
    }

    // Delete list (CASCADE will handle items, activities, shares)
    const { error: deleteError } = await supabase
      .from('sales_lists')
      .delete()
      .eq('id', listId)

    if (deleteError) {
      console.error('[DELETE sales-lists/:id] Error deleting list:', deleteError)
      return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
    }

    console.log('[DELETE sales-lists/:id] Deleted list:', listId)

    return NextResponse.json({ message: 'List deleted successfully' })
  } catch (error) {
    console.error('[DELETE sales-lists/:id] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withCsrfProtection(putHandler)
export const DELETE = withCsrfProtection(deleteHandler)
