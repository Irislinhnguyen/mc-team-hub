/**
 * Individual Suggestion API
 * PATCH - Update suggestion status
 * DELETE - Delete suggestion (managers only, before publish)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import {
  updateSuggestionStatus,
  deleteSuggestion,
} from '@/lib/services/focusService'
import type { UpdateSuggestionRequest } from '@/lib/types/focus'
import { z } from 'zod'

// =====================================================
// PATCH - Update suggestion status
// =====================================================

const updateSuggestionSchema = z.object({
  user_status: z.enum(['pending', 'created', 'cannot_create', 'skipped']).optional(),
  cannot_create_reason: z.string().max(500).nullish(), // Allow null and undefined
  cannot_create_reason_other: z.string().max(500).nullish(), // Allow "Other" reason detail
  user_remark: z.string().max(500).nullish(), // Allow null for consistency
  pipeline_created: z.boolean().optional(), // Allow manual override
  quarter: z.string().optional(), // Quarter of most recent month
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { suggestionId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const suggestionId = params.suggestionId

    // Parse and validate request body
    const body = await request.json()
    const validation = updateSuggestionSchema.safeParse(body)

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

    const updates: UpdateSuggestionRequest = validation.data

    const result = await updateSuggestionStatus(suggestionId, updates, user.sub)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: result.suggestion,
    })
  } catch (error) {
    console.error('Error in PATCH /api/focus-of-month/suggestions/[suggestionId]:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// DELETE - Delete suggestion (managers only)
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { suggestionId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const suggestionId = params.suggestionId

    const result = await deleteSuggestion(suggestionId, user.sub)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Suggestion deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/focus-of-month/suggestions/[suggestionId]:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
