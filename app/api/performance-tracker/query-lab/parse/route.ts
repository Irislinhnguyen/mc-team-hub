import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/services/auth'
import { getQueryLabParser } from '@/lib/services/queryLabParser'
import type { AIParseRequest, AIParseResponse } from '@/lib/types/queryLab'

/**
 * POST /api/performance-tracker/query-lab/parse
 * Parse natural language query into QueryConfig using AI
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authToken = request.cookies.get('__Host-auth_token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    authService.verifyToken(authToken)

    // Parse request body
    const body: AIParseRequest = await request.json()

    // Validate request
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "query" field' },
        { status: 400 }
      )
    }

    if (body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      )
    }

    if (body.query.length > 1000) {
      return NextResponse.json(
        { error: 'Query too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    console.log('[Parse API] Parsing query:', body.query.substring(0, 100) + '...')

    // Get parser instance
    const parser = getQueryLabParser()

    // Parse query
    const result = await parser.parseNaturalLanguage(body)

    if (!result) {
      return NextResponse.json(
        {
          error: 'AI parsing service is not available. Please check OpenAI API configuration.',
          details: 'OPENAI_API_KEY may not be configured'
        },
        { status: 503 }
      )
    }

    // Validate parsed QueryConfig
    const isValid = parser.validateQueryConfig(result.queryConfig)

    if (!isValid) {
      console.warn('[Parse API] Invalid QueryConfig generated:', result.queryConfig)
      return NextResponse.json(
        {
          error: 'AI generated invalid query configuration',
          result,
          suggestions: [
            'Try rephrasing your query with more specific terms',
            'Use entity names like "publishers", "teams", "zones"',
            'Specify operators clearly: "greater than", "equals", etc.'
          ]
        },
        { status: 400 }
      )
    }

    console.log('[Parse API] Successfully parsed with confidence:', result.confidence)

    // Return successful parse result
    return NextResponse.json<AIParseResponse>(result, { status: 200 })

  } catch (error) {
    console.error('[Parse API] Error:', error)

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to parse query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS preflight (if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
