/**
 * Sales List Sharing API
 *
 * Endpoints for managing list sharing:
 * - GET: List all shares for a list
 * - POST: Share list with a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { ShareListInput } from '../../../../../lib/types/salesLists'
import { shareListSchema, validateRequest } from '../../../../../lib/validation/schemas'
import { withCsrfProtection } from '../../../../../lib/middleware/csrf'

/**
 * GET /api/sales-lists/[id]/share
 * Get all shares for a list (only owner can view)
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
      console.error('[GET shares] Invalid token:', error)
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
      console.error('[GET shares] User not found:', userError)
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
      return NextResponse.json({ error: 'Only list owner can view shares' }, { status: 403 })
    }

    // Fetch shares with user info
    const { data: shares, error: sharesError } = await supabase
      .from('sales_list_shares')
      .select(`
        *,
        shared_with:users!shared_with_user_id(id, email, name),
        shared_by:users!shared_by_user_id(email, name)
      `)
      .eq('list_id', listId)
      .order('created_at', { ascending: false })

    if (sharesError) {
      console.error('[GET shares] Error fetching shares:', sharesError)
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
    }

    return NextResponse.json({ shares: shares || [] })
  } catch (error) {
    console.error('[GET shares] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sales-lists/[id]/share
 * Share a list with another user (only owner can share)
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
      console.error('[POST share] Invalid token:', error)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get user ID from database
    const { data: user, error: userError} = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !user) {
      console.error('[POST share] User not found:', userError)
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
      return NextResponse.json({ error: 'Only list owner can share list' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(shareListSchema, body) as ShareListInput

    // Verify target user exists
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', validatedData.shared_with_user_id)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Cannot share with self
    if (validatedData.shared_with_user_id === userId) {
      return NextResponse.json({ error: 'Cannot share list with yourself' }, { status: 400 })
    }

    // Create share
    const { data: newShare, error: shareError } = await supabase
      .from('sales_list_shares')
      .insert({
        list_id: listId,
        shared_with_user_id: validatedData.shared_with_user_id,
        shared_by_user_id: userId,
        permission: validatedData.permission,
      })
      .select(`
        *,
        shared_with:users!shared_with_user_id(id, email, name),
        shared_by:users!shared_by_user_id(email, name)
      `)
      .single()

    if (shareError) {
      console.error('[POST share] Error creating share:', shareError)

      // Check for unique constraint violation
      if (shareError.code === '23505') {
        return NextResponse.json(
          { error: 'List is already shared with this user' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Failed to share list' }, { status: 500 })
    }

    console.log('[POST share] Created share:', newShare.id)

    return NextResponse.json(newShare, { status: 201 })
  } catch (error) {
    console.error('[POST share] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfProtection(postHandler)
