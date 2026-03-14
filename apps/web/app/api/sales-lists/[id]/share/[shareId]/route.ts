/**
 * Individual Share API
 *
 * Endpoints for managing a specific share:
 * - PUT: Update share permission
 * - DELETE: Remove share
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { UpdateShareInput } from '../../../../../../lib/types/salesLists'
import { updateShareSchema, validateRequest } from '../../../../../../lib/validation/schemas'
import { withCsrfProtection } from '../../../../../../lib/middleware/csrf'

/**
 * PUT /api/sales-lists/[id]/share/[shareId]
 * Update share permission (only owner can update)
 */
async function putHandler(
  request: NextRequest,
  { params }: { params: { id: string; shareId: string } }
) {
  try {
    const { id: listId, shareId } = params

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
      console.error('[PUT share] Invalid token:', error)
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
      console.error('[PUT share] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Verify user is the owner of this list
    const { data: list } = await supabase
      .from('sales_lists')
      .select('user_id')
      .eq('id', listId)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    if (list.user_id !== userId) {
      return NextResponse.json({ error: 'Only list owner can update shares' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(updateShareSchema, body) as UpdateShareInput

    // Update share
    const { data: updatedShare, error: updateError } = await supabase
      .from('sales_list_shares')
      .update({ permission: validatedData.permission })
      .eq('id', shareId)
      .eq('list_id', listId)
      .select(`
        *,
        shared_with:users!shared_with_user_id(id, email, name),
        shared_by:users!shared_by_user_id(email, name)
      `)
      .single()

    if (updateError) {
      console.error('[PUT share] Error updating share:', updateError)
      return NextResponse.json({ error: 'Failed to update share' }, { status: 500 })
    }

    console.log('[PUT share] Updated share:', shareId)

    return NextResponse.json(updatedShare)
  } catch (error) {
    console.error('[PUT share] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sales-lists/[id]/share/[shareId]
 * Remove a share (only owner can delete)
 */
async function deleteHandler(
  request: NextRequest,
  { params }: { params: { id: string; shareId: string } }
) {
  try {
    const { id: listId, shareId } = params

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
      console.error('[DELETE share] Invalid token:', error)
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
      console.error('[DELETE share] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Verify user is the owner of this list
    const { data: list } = await supabase
      .from('sales_lists')
      .select('user_id')
      .eq('id', listId)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    if (list.user_id !== userId) {
      return NextResponse.json({ error: 'Only list owner can remove shares' }, { status: 403 })
    }

    // Delete share
    const { error: deleteError } = await supabase
      .from('sales_list_shares')
      .delete()
      .eq('id', shareId)
      .eq('list_id', listId)

    if (deleteError) {
      console.error('[DELETE share] Error deleting share:', deleteError)
      return NextResponse.json({ error: 'Failed to remove share' }, { status: 500 })
    }

    console.log('[DELETE share] Removed share:', shareId)

    return NextResponse.json({ message: 'Share removed successfully' })
  } catch (error) {
    console.error('[DELETE share] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withCsrfProtection(putHandler)
export const DELETE = withCsrfProtection(deleteHandler)
