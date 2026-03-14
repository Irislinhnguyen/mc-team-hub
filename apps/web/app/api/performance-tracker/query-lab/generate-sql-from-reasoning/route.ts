/**
 * API Route: Generate SQL from Confirmed Reasoning (Step 2 of 2-step workflow)
 *
 * This endpoint generates SQL based on user-confirmed reasoning.
 * Called after user reviews and confirms the reasoning breakdown.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateSqlFromReasoning } from '../../../../../lib/services/aiSqlGenerator'
import { getUserFromRequest } from '../../../../../lib/auth/server'
import type { UserContext } from '../../../../../lib/services/openaiUsageTracker'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questionId, question, confirmedReasoning } = body

    // Validation
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { status: 'error', error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    if (!confirmedReasoning) {
      return NextResponse.json(
        { status: 'error', error: 'Confirmed reasoning is required' },
        { status: 400 }
      )
    }

    // Validate reasoning structure
    if (!confirmedReasoning.step1_understanding ||
        !confirmedReasoning.step2_breakdown ||
        !confirmedReasoning.step3_constraints ||
        !confirmedReasoning.step4_sql_plan) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid reasoning structure - missing required steps' },
        { status: 400 }
      )
    }

    console.log('[Generate SQL from Reasoning API] Question:', question)
    console.log('[Generate SQL from Reasoning API] Confirmed reasoning received')

    // Get user context for tracking (using JWT auth)
    // IMPORTANT: Always create user context to ensure tracking works
    let user: UserContext
    try {
      const authUser = getUserFromRequest(request)
      if (authUser) {
        user = {
          userId: authUser.sub || 'anonymous',
          email: authUser.email || 'anonymous@system',
          role: (authUser.role as 'admin' | 'manager' | 'user') || 'user'
        }
      } else {
        user = { userId: 'anonymous', email: 'anonymous@system', role: 'user' }
      }
    } catch (e) {
      user = { userId: 'anonymous', email: 'anonymous@system', role: 'user' }
    }

    // Generate SQL from confirmed reasoning
    const result = await generateSqlFromReasoning(
      question,
      confirmedReasoning,
      undefined, // teamContext - can be added later if needed
      user
    )

    return NextResponse.json({
      status: 'success',
      questionId,
      sql: result.sql,
      warnings: result.warnings,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Generate SQL from Reasoning API] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to generate SQL from reasoning',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
