import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../lib/services/bigquery'
import { feedbackLearningService } from '../../../../../lib/services/feedbackLearningService'

/**
 * Direct SQL Execution API
 *
 * Executes SQL directly (from AI-generated or user-edited queries)
 * Includes safety checks to prevent dangerous operations
 * Records errors in Supabase for learning
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { sql, question } = body // question is optional, for KG learning

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'SQL query is required and must be a string'
        },
        { status: 400 }
      )
    }

    // Safety checks
    const safetySql = sql.trim().toUpperCase()

    // Only allow SELECT statements
    if (!safetySql.startsWith('SELECT') && !safetySql.startsWith('WITH')) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Only SELECT queries are allowed. No INSERT, UPDATE, DELETE, DROP, or other modification operations.'
        },
        { status: 403 }
      )
    }

    // Check for dangerous keywords
    const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE']
    for (const keyword of dangerousKeywords) {
      if (safetySql.includes(keyword)) {
        return NextResponse.json(
          {
            status: 'error',
            error: `Dangerous keyword detected: ${keyword}. Only SELECT queries are allowed.`
          },
          { status: 403 }
        )
      }
    }

    // Enforce LIMIT if not present (prevent huge result sets)
    const hasLimit = safetySql.includes('LIMIT')
    let finalSql = sql
    if (!hasLimit) {
      finalSql = sql.trim()
      if (finalSql.endsWith(';')) {
        finalSql = finalSql.slice(0, -1)
      }
      finalSql += '\nLIMIT 10000'
      console.log('[SQL Executor] Added LIMIT 10000 to query')
    }

    console.log(`[SQL Executor] Executing SQL:\n${finalSql}`)

    // Execute query
    const results = await BigQueryService.executeQuery(finalSql)

    console.log(`[SQL Executor] Query executed successfully: ${results.length} rows`)

    // Infer column metadata from results
    const columns = results.length > 0
      ? Object.keys(results[0]).map(key => {
          const sampleValue = results[0][key]
          const type = typeof sampleValue === 'number' ? 'number'
                     : sampleValue instanceof Date ? 'date'
                     : typeof sampleValue === 'boolean' ? 'boolean'
                     : 'string'

          // Determine if it's a metric or dimension
          const isMetric = type === 'number' && (
            key.includes('rev') || key.includes('req') || key.includes('paid') ||
            key.includes('ecpm') || key.includes('cpm') || key.includes('rate') ||
            key.includes('total') || key.includes('avg') || key.includes('sum')
          )

          return {
            name: key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type,
            category: isMetric ? 'metric' : 'dimension'
          }
        })
      : []

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      status: 'success',
      data: results,
      columns,
      rowCount: results.length,
      executionTime
    })

  } catch (error: any) {
    console.error('[SQL Executor API] Error:', error)

    // Store error in Supabase for learning (fire-and-forget)
    if (question && sql) {
      feedbackLearningService.storeErrorCase(
        question,
        sql,
        error.message || 'Unknown error'
      ).catch(err => console.warn('[SQL Executor] Failed to store error:', err?.message?.substring(0, 50)))
    }

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to execute SQL',
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
