/**
 * Focus Suggestions API
 * GET - List suggestions for a focus
 * POST - Add suggestions from Query Lab
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { getSuggestions, addSuggestions } from '@/lib/services/focusService'
import type { AddSuggestionsRequest } from '@/lib/types/focus'
import { z } from 'zod'

// =====================================================
// GET - List suggestions
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

    const result = await getSuggestions(focusId)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: result.suggestions,
    })
  } catch (error) {
    console.error('Error in GET /api/focus-of-month/[id]/suggestions:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Add suggestions from Query Lab
// =====================================================

const suggestionSchema = z.object({
  pid: z.string().optional().nullable(),
  mid: z.string().min(1),
  product: z.string().min(1),
  media_name: z.string().optional(),
  publisher_name: z.string().optional(),
  pic: z.string().optional(),
  last_30d_requests: z.number().optional(),
  six_month_avg_requests: z.number().optional(),
  thirty_day_avg_revenue: z.number().optional(),
  query_lab_data: z.record(z.any()).optional(),
})

const addSuggestionsSchema = z.object({
  suggestions: z.array(suggestionSchema).min(1),
  source_session_id: z.string().optional(),
})

export async function POST(
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
    const validation = addSuggestionsSchema.safeParse(body)

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

    const requestData: AddSuggestionsRequest = validation.data

    const result = await addSuggestions(focusId, requestData, user.id)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      data: result.suggestions,
      message: `Added ${result.suggestions?.length || 0} suggestions`,
    })
  } catch (error) {
    console.error('Error in POST /api/focus-of-month/[id]/suggestions:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
