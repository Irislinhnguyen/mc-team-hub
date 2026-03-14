/**
 * Simple Plan API (Claude Code style)
 *
 * Handles:
 * - Generate initial plan
 * - Update plan based on feedback
 * - Generate and execute SQL
 * - Auto-retry with self-healing on errors
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateSimplePlan,
  updatePlanWithFeedback,
  generateSqlFromSimplePlan,
  generateSqlWithKnowledgeGraph,
  generateSqlWithTieredStrategy
} from '../../../../../lib/services/aiSqlGenerator'
import BigQueryService from '../../../../../lib/services/bigquery'
import { getTeamsWithPics } from '../../../../../lib/utils/teamMatcher'
import { getUserFromRequest } from '../../../../../lib/auth/server'
import type { UserContext } from '../../../../../lib/services/openaiUsageTracker'
import {
  classifyError,
  isTransientError,
  getAIErrorContext,
  COLUMN_NAME_FIXES,
  VALID_COLUMNS
} from '../../../../../lib/constants/bigqueryErrors'

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,  // 1 second
  maxDelayMs: 8000,   // 8 seconds
  backoffMultiplier: 2
}

/**
 * Sleep helper for backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate backoff delay with jitter
 */
function calculateBackoff(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelayMs
  )
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1)
  return Math.floor(delay + jitter)
}

/**
 * Generate a short title for results from the user's question
 */
function generateResultTitle(question: string): string {
  // Remove common question words and clean up
  let title = question
    .replace(/^(show|find|get|list|display|what|how|can you|please|tìm|hiển thị|liệt kê|cho tôi|xem)\s+/gi, '')
    .replace(/[?!.,]+$/g, '')
    .trim()

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Truncate if too long
  if (title.length > 60) {
    title = title.substring(0, 57) + '...'
  }

  return title || 'Query Results'
}

/**
 * Build team context string for AI
 */
async function buildTeamContext(): Promise<string> {
  try {
    const teamsWithPics = await getTeamsWithPics()

    if (teamsWithPics.length === 0) {
      return ''
    }

    const teamMappings = teamsWithPics
      .map(({ team, pics }) => {
        if (pics.length === 0) return null
        const picList = pics.map(p => `'${p}'`).join(', ')
        return `Team ${team.team_id} (${team.team_name}) → WHERE pic IN (${picList})`
      })
      .filter(Boolean)
      .join('\n')

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CRITICAL: TEAM DATA MAPPING FROM SUPABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT: There is NO 'team' column in the BigQuery pub_data table!

Team information is stored in Supabase and must be converted to PIC filters:

${teamMappings}

HOW TO USE:
- WRONG: WHERE team = 'WEB_GV'  ❌ (column doesn't exist!)
- RIGHT: WHERE pic IN ('VN_ngocth', 'VN_ngantt')  ✅

When user mentions a team name, use the PIC list from above!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  } catch (error) {
    console.error('[Simple Plan] Failed to fetch team mappings:', error)
    return `
⚠️ Team mappings unavailable. If user mentions teams, ask them to use PIC names directly.
`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, question, plan, feedback, conversationHistory, sql } = body

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
        console.log(`[Simple Plan] User context: ${user.email} (${user.role})`)
      } else {
        // Fallback to anonymous user for tracking
        user = {
          userId: 'anonymous',
          email: 'anonymous@system',
          role: 'user'
        }
        console.warn('[Simple Plan] No auth user, using anonymous for tracking')
      }
    } catch (e) {
      // Fallback to anonymous user for tracking
      user = {
        userId: 'anonymous',
        email: 'anonymous@system',
        role: 'user'
      }
      console.warn('[Simple Plan] Auth error, using anonymous for tracking:', e)
    }

    // ACTION: generate - Generate initial plan
    if (action === 'generate') {
      if (!question) {
        return NextResponse.json(
          { status: 'error', error: 'Question is required' },
          { status: 400 }
        )
      }

      const result = await generateSimplePlan(question, undefined, conversationHistory, user)

      return NextResponse.json({
        status: 'success',
        plan: result.plan,
        confidence: result.confidence
      })
    }

    // ACTION: update - Update plan based on feedback
    if (action === 'update') {
      if (!question || !plan || !feedback) {
        return NextResponse.json(
          { status: 'error', error: 'Question, plan, and feedback are required' },
          { status: 400 }
        )
      }

      const result = await updatePlanWithFeedback(question, plan, feedback, conversationHistory || '', user)

      return NextResponse.json({
        status: 'success',
        plan: result.plan,
        confidence: result.confidence
      })
    }

    // ACTION: generate-sql - Generate SQL only (don't execute yet)
    // NOW USES: Tiered Strategy with Conversation Memory for cost optimization
    if (action === 'generate-sql') {
      if (!question || !plan) {
        return NextResponse.json(
          { status: 'error', error: 'Question and plan are required' },
          { status: 400 }
        )
      }

      // Always fetch team context
      const teamContext = await buildTeamContext()

      // Extract sessionId from body (optional)
      const { sessionId } = body

      // Use Tiered Strategy for cost optimization when sessionId is provided
      if (sessionId) {
        console.log('[Simple Plan] Using Tiered Strategy with session:', sessionId)

        const tieredResult = await generateSqlWithTieredStrategy(question, {
          sessionId,
          teamContext,
          conversationHistory: conversationHistory || '',
          user,
          useKG: true
        })

        // Generate a short title from the question
        const resultTitle = generateResultTitle(question)

        console.log('[Simple Plan] Tiered result:', {
          source: tieredResult.source,
          model: tieredResult.model,
          questionType: tieredResult.questionType,
          sqlLength: tieredResult.sql.length
        })

        return NextResponse.json({
          status: 'success',
          sql: tieredResult.sql,
          warnings: tieredResult.warnings,
          resultTitle: resultTitle,
          // Include tiered strategy info for debugging/monitoring
          tieredInfo: {
            source: tieredResult.source,
            model: tieredResult.model,
            questionType: tieredResult.questionType,
            changes: tieredResult.changes || [],
            confidence: tieredResult.confidence
          },
          kgInfo: tieredResult.kgContext ? {
            concepts: tieredResult.kgContext.concepts.length,
            patterns: tieredResult.kgContext.patterns.length,
            rules: tieredResult.kgContext.rules.length
          } : null
        })
      }

      // Fallback: Use Knowledge Graph enhanced SQL generation (no session)
      console.log('[Simple Plan] Using Knowledge Graph for SQL generation (no session)')
      const kgResult = await generateSqlWithKnowledgeGraph(question, {
        teamContext,
        conversationHistory: conversationHistory || '',
        useKG: true,
        user
      })

      // Generate a short title from the question
      const resultTitle = generateResultTitle(question)

      console.log('[Simple Plan] SQL generated with Knowledge Graph')
      console.log('[Simple Plan] SQL length:', kgResult.sql.length)
      console.log('[Simple Plan] KG concepts used:', kgResult.kgContext?.concepts?.length || 0)
      console.log('[Simple Plan] Result title:', resultTitle)

      return NextResponse.json({
        status: 'success',
        sql: kgResult.sql,
        warnings: kgResult.warnings,
        resultTitle: resultTitle,
        kgInfo: kgResult.kgContext ? {
          concepts: kgResult.kgContext.concepts.length,
          patterns: kgResult.kgContext.patterns.length,
          rules: kgResult.kgContext.rules.length
        } : null
      })
    }

    // ACTION: execute - Execute SQL that was already generated
    if (action === 'execute') {
      if (!sql) {
        return NextResponse.json(
          { status: 'error', error: 'SQL is required' },
          { status: 400 }
        )
      }

      const startTime = Date.now()

      // Import feedback learning service for logging
      const { feedbackLearningService } = await import('../../../../../lib/services/feedbackLearningService')

      try {
        // Execute the SQL directly using BigQueryService
        console.log('[Simple Plan] Executing SQL...')
        const results = await BigQueryService.executeQuery(sql)
        const executionTime = Date.now() - startTime

        console.log('[Simple Plan] Query executed successfully, rows:', results.length)

        // Fire-and-forget: Log successful execution for training
        feedbackLearningService.storeQueryExecution({
          question: question || '',
          plan: plan,
          sql: sql,
          status: 'success',
          rowCount: results.length,
          executionTimeMs: executionTime
        }).catch(err => console.warn('[Simple Plan] Failed to log execution:', err?.message?.substring(0, 50)))

        return NextResponse.json({
          status: 'success',
          results: results,
          rowCount: results.length
        })
      } catch (execError: any) {
        const executionTime = Date.now() - startTime

        // Fire-and-forget: Log failed execution for training
        feedbackLearningService.storeQueryExecution({
          question: question || '',
          plan: plan,
          sql: sql,
          status: 'error',
          errorMessage: execError.message || 'Unknown error',
          executionTimeMs: executionTime
        }).catch(err => console.warn('[Simple Plan] Failed to log execution:', err?.message?.substring(0, 50)))

        // Return error to client (will trigger auto-fix in frontend)
        return NextResponse.json(
          { status: 'error', error: execError.message || 'Query execution failed' },
          { status: 500 }
        )
      }
    }

    // ACTION: execute-with-retry - Execute SQL with automatic retry and self-healing
    if (action === 'execute-with-retry') {
      if (!sql || !question) {
        return NextResponse.json(
          { status: 'error', error: 'SQL and question are required' },
          { status: 400 }
        )
      }

      const startTime = Date.now()
      const { feedbackLearningService } = await import('../../../../../lib/services/feedbackLearningService')
      const teamContext = await buildTeamContext()

      // Track retry attempts
      const retryHistory: Array<{
        attempt: number
        sql: string
        error: string
        errorType: string
        fixed: boolean
      }> = []

      let currentSql = sql
      let lastError: string = ''

      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
          console.log(`[Execute-Retry] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`)

          // Execute query
          const results = await BigQueryService.executeQuery(currentSql)
          const executionTime = Date.now() - startTime

          console.log(`[Execute-Retry] Success on attempt ${attempt + 1}, rows: ${results.length}`)

          // Log successful execution
          feedbackLearningService.storeQueryExecution({
            question,
            plan: plan || '',
            sql: currentSql,
            status: 'success',
            rowCount: results.length,
            executionTimeMs: executionTime
          }).catch(err => console.warn('[Execute-Retry] Log failed:', err?.message?.substring(0, 50)))

          return NextResponse.json({
            status: 'success',
            results,
            rowCount: results.length,
            retryInfo: {
              totalAttempts: attempt + 1,
              history: retryHistory,
              finalSql: currentSql,
              wasRetried: attempt > 0
            }
          })
        } catch (execError: any) {
          const errorMessage = execError.message || 'Unknown error'
          lastError = errorMessage

          console.log(`[Execute-Retry] Attempt ${attempt + 1} failed:`, errorMessage.substring(0, 100))

          // Classify the error
          const errorClass = classifyError(errorMessage)

          // Record this attempt
          retryHistory.push({
            attempt: attempt + 1,
            sql: currentSql,
            error: errorMessage,
            errorType: errorClass.type,
            fixed: false
          })

          // Check if we should retry
          if (attempt >= RETRY_CONFIG.maxRetries) {
            console.log('[Execute-Retry] Max retries reached, giving up')
            break
          }

          // For transient errors, just wait and retry same SQL
          if (isTransientError(errorMessage)) {
            const delay = calculateBackoff(attempt)
            console.log(`[Execute-Retry] Transient error, waiting ${delay}ms before retry`)
            await sleep(delay)
            continue
          }

          // For non-retryable errors, don't retry
          if (!errorClass.retryable) {
            console.log(`[Execute-Retry] Non-retryable error type: ${errorClass.type}`)
            break
          }

          // Try to auto-fix the SQL
          if (errorClass.autoFixable) {
            console.log('[Execute-Retry] Attempting auto-fix...')

            try {
              // Get AI context for fixing
              const aiErrorContext = getAIErrorContext(errorMessage)

              // Use OpenAI to fix
              const OpenAI = (await import('openai')).default
              const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

              const { SYSTEM_PROMPT } = await import('../../../../../lib/services/aiSqlGenerator')
              const schemaContext = SYSTEM_PROMPT?.split?.('STAGE 1: REASONING PROCESS')?.[0] || ''

              const fixResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',  // Use faster model for fixes
                messages: [
                  {
                    role: 'system',
                    content: `You are a BigQuery SQL error fixer. Fix the SQL query based on the error.

${schemaContext}
${teamContext}

VALID COLUMNS:
- pub_data: ${VALID_COLUMNS.pub_data.join(', ')}
- updated_product_name: ${VALID_COLUMNS.updated_product_name.join(', ')}

COMMON FIXES:
${Object.entries(COLUMN_NAME_FIXES).map(([k, v]) => `- ${k} → ${v}`).join('\n')}

Respond with ONLY the fixed SQL query, no explanation.`
                  },
                  {
                    role: 'user',
                    content: `Fix this SQL query:

${currentSql}

Error: ${errorMessage}

${aiErrorContext}

Return ONLY the fixed SQL.`
                  }
                ],
                temperature: 0,
                max_tokens: 2000
              })

              const fixedSql = fixResponse.choices[0].message.content?.trim() || ''

              // Validate fixed SQL is different and looks valid
              if (fixedSql && fixedSql !== currentSql && fixedSql.toUpperCase().startsWith('SELECT')) {
                console.log('[Execute-Retry] Got fixed SQL, retrying...')
                currentSql = fixedSql
                retryHistory[retryHistory.length - 1].fixed = true

                // Small delay before retry
                await sleep(500)
                continue
              } else {
                console.log('[Execute-Retry] Fixed SQL invalid or unchanged')
              }
            } catch (fixError: any) {
              console.warn('[Execute-Retry] Auto-fix failed:', fixError?.message?.substring(0, 50))
            }
          }

          // Wait before next retry
          const delay = calculateBackoff(attempt)
          await sleep(delay)
        }
      }

      // All retries exhausted
      const executionTime = Date.now() - startTime

      // Log final failure
      feedbackLearningService.storeQueryExecution({
        question,
        plan: plan || '',
        sql: currentSql,
        status: 'error',
        errorMessage: lastError,
        executionTimeMs: executionTime
      }).catch(err => console.warn('[Execute-Retry] Log failed:', err?.message?.substring(0, 50)))

      // Store error case for learning
      feedbackLearningService.storeErrorCase(question, currentSql, lastError)
        .catch(err => console.warn('[Execute-Retry] Error case store failed:', err?.message?.substring(0, 50)))

      return NextResponse.json(
        {
          status: 'error',
          error: lastError,
          retryInfo: {
            totalAttempts: retryHistory.length,
            history: retryHistory,
            finalSql: currentSql,
            exhausted: true
          }
        },
        { status: 500 }
      )
    }

    // ACTION: adjust-sql - Regenerate SQL based on feedback
    if (action === 'adjust-sql') {
      if (!question || !plan || !sql || !feedback) {
        return NextResponse.json(
          { status: 'error', error: 'Question, plan, current SQL, and feedback are required' },
          { status: 400 }
        )
      }

      // Always fetch team context
      const teamContext = await buildTeamContext()

      // Regenerate SQL with feedback
      const adjustedPlan = `${plan}\n\nUser feedback on SQL: ${feedback}`
      const sqlResult = await generateSqlFromSimplePlan(question, adjustedPlan, teamContext, user)

      console.log('[Simple Plan] SQL adjusted based on feedback')

      return NextResponse.json({
        status: 'success',
        sql: sqlResult.sql,
        warnings: sqlResult.warnings
      })
    }

    // ACTION: auto-fix-error - AI analyzes error and fixes SQL OR asks clarifying question
    if (action === 'auto-fix-error') {
      const { errorMessage } = body
      if (!question || !sql || !errorMessage) {
        return NextResponse.json(
          { status: 'error', error: 'Question, SQL, and errorMessage are required' },
          { status: 400 }
        )
      }

      console.log('[Simple Plan] Auto-fixing error:', errorMessage.substring(0, 100))

      // Always fetch team context
      const teamContext = await buildTeamContext()

      // Create a detailed error context for AI
      const errorContext = `
The previous SQL failed with this error:
ERROR: ${errorMessage}

Previous SQL that failed:
\`\`\`sql
${sql}
\`\`\`

IMPORTANT: Analyze the error and either:
1. Fix the SQL if you understand the problem (column name, syntax, etc.)
2. OR if you need more information from the user, generate a clarifying question

Response format (JSON):
{
  "canFix": true/false,
  "fixedSql": "SELECT ... (only if canFix is true)",
  "explanation": "Brief explanation of what was wrong and how you fixed it",
  "clarifyingQuestion": "Question for user (only if canFix is false)"
}
`

      // Use OpenAI to analyze and fix
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      // Get schema context
      const { SYSTEM_PROMPT } = await import('../../../../../lib/services/aiSqlGenerator')
      let schemaContext = ''
      try {
        // Access the SYSTEM_PROMPT - need to get just the schema part
        schemaContext = SYSTEM_PROMPT?.split?.('STAGE 1: REASONING PROCESS')?.[0] || ''
      } catch {
        console.warn('[Auto-fix] Could not load schema context')
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a BigQuery SQL expert. Analyze errors and fix SQL queries.

**CRITICAL: LANGUAGE DETECTION**
Detect the language of the user's original question and ALWAYS respond in the SAME language:
- Vietnamese question → Vietnamese explanation/clarifying question
- English question → English explanation/clarifying question
- Japanese/Indonesian/etc → Same language response

${schemaContext}
${teamContext}

Remember:
- Valid columns for pub_data: date, pic, pid, pubname, mid, medianame, zid, zonename, rev, profit, paid, req, request_CPM, month, year
- Valid columns for updated_product_name: pid, pubname, mid, medianame, zid, zonename, H5, product
- Common mistakes:
  - mname → use medianame
  - pname → use pubname
  - team → use pic IN (...)
  - quarter → does NOT exist! Calculate: CEIL(month / 3) AS quarter
`
          },
          {
            role: 'user',
            content: `Original question: "${question}"

${errorContext}

Analyze and respond with JSON.`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')

      console.log('[Simple Plan] Auto-fix result:', result.canFix ? 'Fixed SQL' : 'Needs clarification')

      // Import feedback learning service (Supabase-based)
      const { feedbackLearningService } = await import('../../../../../lib/services/feedbackLearningService')

      if (result.canFix && result.fixedSql) {
        // Fire-and-forget: Store error fix in Supabase (non-blocking)
        feedbackLearningService.storeErrorCase(
          question,
          sql,
          errorMessage
        ).catch(err => console.warn('[Simple Plan] Feedback store failed (non-blocking):', err?.message?.substring(0, 50)))

        return NextResponse.json({
          status: 'success',
          fixed: true,
          sql: result.fixedSql,
          explanation: result.explanation || 'SQL has been fixed'
        })
      } else {
        // Fire-and-forget: Store clarification case in Supabase (non-blocking)
        feedbackLearningService.storeErrorCase(
          question,
          sql,
          errorMessage
        ).catch(err => console.warn('[Simple Plan] Feedback store failed (non-blocking):', err?.message?.substring(0, 50)))

        return NextResponse.json({
          status: 'success',
          fixed: false,
          clarifyingQuestion: result.clarifyingQuestion || 'Could you please provide more details about what you want to query?',
          explanation: result.explanation || 'Need more information to fix the query'
        })
      }
    }

    // ACTION: store-feedback - Store user feedback for learning
    if (action === 'store-feedback') {
      const { feedback: feedbackType, feedbackText } = body
      if (!question) {
        return NextResponse.json(
          { status: 'error', error: 'Question is required' },
          { status: 400 }
        )
      }

      console.log('[Simple Plan] Storing feedback:', feedbackType)

      // Import feedback learning service (Supabase-based)
      const { feedbackLearningService } = await import('../../../../../lib/services/feedbackLearningService')

      try {
        if (feedbackType === 'positive') {
          // Fire-and-forget: Store positive feedback (non-blocking)
          feedbackLearningService.storeFeedback({
            question,
            sql: sql || '',
            feedbackType: 'positive'
          }).catch(err => console.warn('[Simple Plan] Feedback store failed:', err?.message?.substring(0, 50)))
        } else if (feedbackType === 'negative') {
          // Fire-and-forget: Store negative feedback (non-blocking)
          feedbackLearningService.storeFeedback({
            question,
            sql: sql || '',
            feedbackType: 'negative',
            feedbackText: feedbackText || ''
          }).catch(err => console.warn('[Simple Plan] Feedback store failed:', err?.message?.substring(0, 50)))
        }

        return NextResponse.json({
          status: 'success',
          message: 'Feedback stored successfully'
        })
      } catch (fbError) {
        console.warn('[Simple Plan] Failed to store feedback:', fbError)
        // Don't fail the request, just log the error
        return NextResponse.json({
          status: 'success',
          message: 'Feedback received (storage may be unavailable)'
        })
      }
    }

    return NextResponse.json(
      { status: 'error', error: 'Invalid action. Use: generate, update, generate-sql, execute, execute-with-retry, adjust-sql, auto-fix-error, or store-feedback' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[Simple Plan API] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to process request',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
