/**
 * API Route: Generate Reasoning (Step 1 of 2-step workflow)
 *
 * This endpoint generates only the 4-step reasoning breakdown without SQL.
 * User can review and provide feedback before SQL generation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateReasoningFromQuestion } from '../../../../../lib/services/aiSqlGenerator'
import { getUserFromRequest } from '../../../../../lib/auth/server'
import type { UserContext } from '../../../../../lib/services/openaiUsageTracker'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, conversationHistory } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { status: 'error', error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    console.log('[Generate Reasoning API] Question:', question)

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

    // Format conversation history for AI context
    let formattedHistory = ''
    if (conversationHistory && conversationHistory.exchanges && conversationHistory.exchanges.length > 0) {
      formattedHistory = conversationHistory.exchanges.map((exchange: any, idx: number) =>
        `Exchange ${idx + 1} (Step ${exchange.stepNumber}):\nUser: ${exchange.userFeedback}\nAI: ${exchange.aiResponse}\n`
      ).join('\n')
    }

    // Generate reasoning breakdown
    const result = await generateReasoningFromQuestion(
      question,
      undefined, // teamContext - can be added later if needed
      formattedHistory,
      user
    )

    // Generate unique question ID
    const questionId = crypto.randomUUID()

    return NextResponse.json({
      status: 'success',
      questionId,
      reasoning: result.reasoning,
      understanding: result.understanding,
      confidence: result.understanding.confidence,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Generate Reasoning API] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to generate reasoning',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
