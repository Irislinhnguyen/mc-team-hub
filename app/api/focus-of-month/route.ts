/**
 * Focus of the Month API - Main CRUD
 * Endpoints: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, canManageFocus } from '@/lib/auth/server'
import {
  listFocuses,
  createFocus,
} from '@/lib/services/focusService'
import type { CreateFocusRequest, FocusListFilters } from '@/lib/types/focus'
import { z } from 'zod'

// =====================================================
// GET - List all focuses with filters
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)

    // Regular users can only see published focuses
    const userStatusFilter = searchParams.get('status') as any
    const effectiveStatus = canManageFocus(user)
      ? userStatusFilter  // Leader/Manager/Admin can filter by any status
      : 'published'       // Regular users only see published

    const filters: FocusListFilters = {
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      team: searchParams.get('team') || undefined,
      group: (searchParams.get('group') as 'sales' | 'cs') || undefined,
      status: effectiveStatus,
      search: searchParams.get('search') || undefined,
    }

    const result = await listFocuses(filters)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: result.focuses,
    })
  } catch (error) {
    console.error('Error in GET /api/focus-of-month:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Create new focus
// =====================================================

const createFocusSchema = z.object({
  focus_month: z.number().min(1).max(12),
  focus_year: z.number().min(2020).max(2100),
  group_type: z.enum(['sales', 'cs']),
  team_id: z.string().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can manage Focus of the Month (Leader/Manager/Admin)
    if (!canManageFocus(user)) {
      return NextResponse.json(
        { status: 'error', message: 'Forbidden: Insufficient permissions to create focuses' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createFocusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Validation error',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const focusData: CreateFocusRequest = validation.data

    const result = await createFocus(focusData, user.sub)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: result.focus,
    })
  } catch (error) {
    console.error('Error in POST /api/focus-of-month:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
