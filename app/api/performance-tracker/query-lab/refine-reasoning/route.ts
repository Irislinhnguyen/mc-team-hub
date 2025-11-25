/**
 * API Route: Refine Reasoning (Conversational Feedback)
 *
 * This endpoint refines reasoning based on user feedback.
 * Used in the conversational loop of the 2-step workflow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { refineReasoningWithFeedback } from '../../../../../lib/services/aiSqlGenerator'
import { getUserFromRequest } from '../../../../../lib/auth/server'
import type { UserContext } from '../../../../../lib/services/openaiUsageTracker'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      questionId,
      question,
      currentReasoning,
      stepNumber,
      userFeedback,
      conversationHistory
    } = body

    // Validation
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { status: 'error', error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    if (!currentReasoning) {
      return NextResponse.json(
        { status: 'error', error: 'Current reasoning is required' },
        { status: 400 }
      )
    }

    if (!stepNumber || ![1, 2, 3, 4].includes(stepNumber)) {
      return NextResponse.json(
        { status: 'error', error: 'Step number must be 1, 2, 3, or 4' },
        { status: 400 }
      )
    }

    if (!userFeedback || typeof userFeedback !== 'string') {
      return NextResponse.json(
        { status: 'error', error: 'User feedback is required and must be a string' },
        { status: 400 }
      )
    }

    console.log(`[Refine Reasoning API] Question: ${question}`)
    console.log(`[Refine Reasoning API] Step ${stepNumber} feedback: ${userFeedback}`)

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

    // Format conversation history
    let formattedHistory = ''
    if (conversationHistory && conversationHistory.exchanges && conversationHistory.exchanges.length > 0) {
      formattedHistory = conversationHistory.exchanges.map((exchange: any, idx: number) =>
        `Exchange ${idx + 1} (Step ${exchange.stepNumber}):\nUser: ${exchange.userFeedback}\nAI: ${exchange.aiResponse}\n`
      ).join('\n')
    }

    // Refine reasoning with feedback
    const result = await refineReasoningWithFeedback(
      question,
      currentReasoning,
      stepNumber,
      userFeedback,
      formattedHistory,
      user
    )

    // Create conversation exchange record
    const exchange = {
      id: uuidv4(),
      stepNumber,
      userFeedback,
      aiResponse: result.aiResponse,
      refinedContent: result.reasoning[`step${stepNumber}_${getStepKey(stepNumber)}`],
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      status: 'success',
      questionId: questionId || uuidv4(),
      refinedReasoning: result.reasoning,
      aiResponse: result.aiResponse,
      confidence: result.confidence,
      exchange,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Refine Reasoning API] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to refine reasoning',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

function getStepKey(stepNumber: number): string {
  const keys = {
    1: 'understanding',
    2: 'breakdown',
    3: 'constraints',
    4: 'sql_plan'
  }
  return keys[stepNumber as keyof typeof keys]
}
