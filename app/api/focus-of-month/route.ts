/**
 * Focus of the Month API - Main CRUD
 * Endpoints: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import {
  listFocuses,
  createFocus,
  getManagerRoles,
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
    const filters: FocusListFilters = {
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      team: searchParams.get('team') || undefined,
      group: (searchParams.get('group') as 'sales' | 'cs') || undefined,
      status: searchParams.get('status') as any,
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

    // Check if user is a focus manager
    // If user is admin, allow immediately
    if (user.role !== 'admin') {
      const rolesResult = await getManagerRoles()

      // If roles check fails, log but allow (graceful degradation)
      if (!rolesResult.success) {
        console.warn('Failed to check manager roles, allowing by default:', rolesResult.error)
      } else {
        // Check if user has create permission
        const hasPermission = rolesResult.roles?.some(
          (r) =>
            r.user_id === user.id &&
            r.can_create
        )

        if (!hasPermission && rolesResult.roles && rolesResult.roles.length > 0) {
          // Only block if roles table has data and user is not in it
          return NextResponse.json(
            { status: 'error', message: 'Only focus managers can create focuses' },
            { status: 403 }
          )
        }
      }
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

    const result = await createFocus(focusData, user.id)

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
