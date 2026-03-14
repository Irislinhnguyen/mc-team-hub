import { NextRequest, NextResponse } from 'next/server'
import { generateSqlWithKnowledgeGraph } from '../../../../../lib/services/aiSqlGenerator'
import { getTeamsWithPics } from '../../../../../lib/utils/teamMatcher'
import { getUserFromRequest } from '../../../../../lib/auth/server'
import type { UserContext } from '../../../../../lib/services/openaiUsageTracker'

/**
 * AI SQL Generation API
 *
 * Generates BigQuery SQL from natural language questions
 * NOW USES: Knowledge Graph for intelligent context building
 * - Extracts concepts from question (Vietnamese/English/Japanese/Indonesian)
 * - Matches query patterns from KG
 * - Applies business rules automatically
 * - Dynamically fetches team→PIC mappings from Supabase
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, conversationHistory, debug } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Question is required and must be a string'
        },
        { status: 400 }
      )
    }

    console.log(`[AI SQL Generator] Processing question: "${question}"`)
    console.log(`[AI SQL Generator] Using Knowledge Graph for context`)

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
        console.log(`[AI SQL Generator] User context: ${user.email} (${user.role})`)
      } else {
        // Fallback to anonymous user for tracking
        user = {
          userId: 'anonymous',
          email: 'anonymous@system',
          role: 'user'
        }
        console.warn('[AI SQL Generator] No auth user, using anonymous for tracking')
      }
    } catch (e) {
      // Fallback to anonymous user for tracking
      user = {
        userId: 'anonymous',
        email: 'anonymous@system',
        role: 'user'
      }
      console.warn('[AI SQL Generator] Auth error, using anonymous for tracking:', e)
    }

    // Detect team mentions in question and build team context
    const teamPattern = /team[_\s]+([A-Z_]+)/gi
    const teamMatches = [...question.matchAll(teamPattern)]

    let teamContext = ''

    if (teamMatches.length > 0) {
      console.log(`[AI SQL Generator] Detected team mentions, fetching from Supabase...`)

      try {
        const teamsWithPics = await getTeamsWithPics()
        const teamMappings: string[] = []

        for (const match of teamMatches) {
          const teamName = match[1].toUpperCase().replace(/\s+/g, '_')

          const teamData = teamsWithPics.find(t =>
            t.team.team_id.toUpperCase() === teamName ||
            t.team.team_id.toUpperCase().includes(teamName)
          )

          if (teamData && teamData.pics.length > 0) {
            const picList = teamData.pics.map(p => `'${p}'`).join(', ')
            teamMappings.push(`Team ${teamData.team.team_id} → WHERE pic IN (${picList})`)
            console.log(`[AI SQL Generator] Found ${teamData.pics.length} PICs for team ${teamData.team.team_id}`)
          }
        }

        if (teamMappings.length > 0) {
          teamContext = `\n\nCURRENT TEAM MAPPINGS FROM SUPABASE:\n${teamMappings.join('\n')}\n`
        }
      } catch (error) {
        console.error('[AI SQL Generator] Failed to fetch teams:', error)
      }
    }

    // Generate SQL using Knowledge Graph enhanced generator
    const result = await generateSqlWithKnowledgeGraph(question, {
      teamContext,
      conversationHistory,
      user,
      useKG: true // Always use KG
    })

    console.log(`[AI SQL Generator] Generated SQL with ${result.understanding?.confidence * 100 || 0}% confidence`)

    // Build response
    const response: any = {
      status: 'success',
      reasoning: result.reasoning,
      understanding: result.understanding,
      sql: result.sql,
      warnings: result.warnings
    }

    // Include KG debug info if requested
    if (debug && result.kgContext) {
      response.kgDebug = {
        concepts_detected: result.kgContext.concepts.length,
        concepts: result.kgContext.concepts.map(c => ({
          text: c.original_text,
          maps_to: `${c.concept.maps_to_type}:${c.concept.maps_to_value}`,
          confidence: c.confidence
        })),
        tables_used: result.kgContext.schema.tables.map(t => t.name),
        patterns_matched: result.kgContext.patterns.map(p => p.pattern_name),
        rules_applied: result.kgContext.rules.map(r => r.rule_name)
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[AI SQL Generator API] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to generate SQL',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 })
}
