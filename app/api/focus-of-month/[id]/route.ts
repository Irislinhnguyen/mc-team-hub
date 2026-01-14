/**
 * Focus of the Month API - Individual focus operations
 * GET - Get focus by ID
 * PATCH - Update focus
 * DELETE - Delete focus (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import {
  getFocusById,
  updateFocus,
  deleteFocus,
  getSuggestions,
} from '@/lib/services/focusService'
import type { UpdateFocusRequest } from '@/lib/types/focus'
import { z } from 'zod'

// =====================================================
// GET - Get focus by ID with suggestions
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const focusId = params.id

    // Get focus
    const focusResult = await getFocusById(focusId)
    if (!focusResult.success) {
      return NextResponse.json(
        { status: 'error', message: focusResult.error },
        { status: 404 }
      )
    }

    // Get suggestions
    const suggestionsResult = await getSuggestions(focusId)
    if (!suggestionsResult.success) {
      return NextResponse.json(
        { status: 'error', message: suggestionsResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: {
        ...focusResult.focus,
        suggestions: suggestionsResult.suggestions || [],
      },
    })
  } catch (error) {
    console.error('Error in GET /api/focus-of-month/[id]:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// PATCH - Update focus
// =====================================================

const updateFocusSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const focusId = params.id

    // Parse and validate request body
    const body = await request.json()
    const validation = updateFocusSchema.safeParse(body)

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

    const updates: UpdateFocusRequest = validation.data

    const result = await updateFocus(focusId, updates, user.sub)

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
    console.error('Error in PATCH /api/focus-of-month/[id]:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// DELETE - Delete focus (admin only)
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete
    if (user.role !== 'admin') {
      return NextResponse.json(
        { status: 'error', message: 'Only admins can delete focuses' },
        { status: 403 }
      )
    }

    const focusId = params.id

    const result = await deleteFocus(focusId)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Focus deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/focus-of-month/[id]:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
