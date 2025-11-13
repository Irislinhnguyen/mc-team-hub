/**
 * Sales Lists API
 *
 * Endpoints for managing sales lists:
 * - GET: List user's own lists and lists shared with them
 * - POST: Create a new sales list
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { SalesList, CreateSalesListInput, SalesListWithStats } from '../../../lib/types/salesLists'
import { createSalesListSchema, validateRequest } from '../../../lib/validation/schemas'
import { withCsrfProtection } from '../../../lib/middleware/csrf'

/**
 * GET /api/sales-lists
 * List all sales lists accessible to the user (own + shared)
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie
    const authToken = request.cookies.get('__Host-auth_token')?.value

    console.log('[GET sales-lists] Auth token present:', !!authToken)

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

      console.log('[GET sales-lists] Authenticated user:', userEmail)
    } catch (error) {
      console.error('[GET sales-lists] Invalid token:', error)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get user ID from database using email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !user) {
      console.error('[GET sales-lists] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Fetch user's own lists with stats
    const { data: ownLists, error: ownError } = await supabase
      .from('sales_lists')
      .select(`
        *,
        items:sales_list_items(count),
        activities:sales_list_items(
          activities:sales_list_activities(
            id,
            activity_type,
            contact_outcome,
            response_outcome,
            closed_status,
            deal_value
          )
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (ownError) {
      console.error('[GET sales-lists] Error fetching own lists:', ownError)
      return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
    }

    // Fetch shared lists (lists shared with this user)
    const { data: sharedListIds, error: sharesError } = await supabase
      .from('sales_list_shares')
      .select('list_id')
      .eq('shared_with_user_id', userId)

    let sharedLists: any[] = []

    if (!sharesError && sharedListIds && sharedListIds.length > 0) {
      const listIds = sharedListIds.map(share => share.list_id)

      const { data: lists, error: listsError } = await supabase
        .from('sales_lists')
        .select(`
          *,
          items:sales_list_items(count),
          activities:sales_list_items(
            activities:sales_list_activities(
              id,
              activity_type,
              contact_outcome,
              response_outcome,
              closed_status,
              deal_value
            )
          )
        `)
        .in('id', listIds)
        .order('updated_at', { ascending: false })

      if (!listsError && lists) {
        sharedLists = lists
      }
    }

    // Transform to include stats
    const transformListWithStats = (list: any): SalesListWithStats => {
      const items = list.activities || []
      const allActivities = items.flatMap((item: any) => item.activities || [])

      const totalContacts = allActivities.filter((a: any) => a.activity_type === 'contact').length
      const totalRetargets = allActivities.filter((a: any) => a.contact_outcome === 'retarget').length

      return {
        id: list.id,
        user_id: list.user_id,
        name: list.name,
        description: list.description,
        color: list.color,
        created_at: list.created_at,
        updated_at: list.updated_at,
        total_items: list.items?.[0]?.count || 0,
        total_contacts: totalContacts,
        total_retargets: totalRetargets,
        closed_won_count: allActivities.filter((a: any) => a.closed_status === 'closed_won').length,
        closed_lost_count: allActivities.filter((a: any) => a.closed_status === 'closed_lost').length,
        positive_count: allActivities.filter((a: any) => a.response_outcome === 'positive').length,
        negative_count: allActivities.filter((a: any) => a.response_outcome === 'negative').length,
        awaiting_count: allActivities.filter((a: any) => a.activity_type === 'contact' && !a.response_outcome).length,
      }
    }

    const response = {
      own_lists: (ownLists || []).map(transformListWithStats),
      shared_lists: (sharedLists || []).map(transformListWithStats),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GET sales-lists] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sales-lists
 * Create a new sales list
 */
async function postHandler(request: NextRequest) {
  try {
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
      console.error('[POST sales-lists] Invalid token:', error)
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
      console.error('[POST sales-lists] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(createSalesListSchema, body) as CreateSalesListInput

    // Create new list
    const { data: newList, error: createError } = await supabase
      .from('sales_lists')
      .insert({
        user_id: userId,
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color || '#1565C0',
      })
      .select()
      .single()

    if (createError) {
      console.error('[POST sales-lists] Error creating list:', createError)

      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A list with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
    }

    console.log('[POST sales-lists] Created list:', newList.id)

    return NextResponse.json(newList, { status: 201 })
  } catch (error) {
    console.error('[POST sales-lists] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withCsrfProtection(postHandler)
