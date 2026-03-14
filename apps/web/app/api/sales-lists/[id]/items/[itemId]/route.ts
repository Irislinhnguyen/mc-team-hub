/**
 * Individual Sales List Item API
 *
 * Endpoints for managing a specific item in a sales list:
 * - DELETE: Remove item from list
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { withCsrfProtection } from '../../../../../../lib/middleware/csrf'

/**
 * DELETE /api/sales-lists/[id]/items/[itemId]
 * Remove an item from a list
 */
async function deleteHandler(
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
      console.error('[DELETE item] Invalid token:', error)
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
      console.error('[DELETE item] User not found:', userError)
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

    // Delete item (CASCADE will handle activities)
    const { error: deleteError } = await supabase
      .from('sales_list_items')
      .delete()
      .eq('id', itemId)
      .eq('list_id', listId)

    if (deleteError) {
      console.error('[DELETE item] Error deleting item:', deleteError)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    console.log('[DELETE item] Deleted item:', itemId)

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('[DELETE item] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const DELETE = withCsrfProtection(deleteHandler)
