/**
 * Test Query Execution with OpenAI Analysis
 * Execute BigQuery queries and get AI-powered insights
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { getOpenAIAnalyzer } from '../../../../lib/services/openai'

interface TestQueryRequest {
  query: string
  question?: string
  includeAnalysis?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: TestQueryRequest = await request.json()
    const { query, question, includeAnalysis = true } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    console.log('[Test Query] Executing query:', query.substring(0, 100) + '...')

    // Execute query
    const startTime = Date.now()
    const rows = await BigQueryService.executeQuery(query)
    const executionTime = Date.now() - startTime

    console.log(`[Test Query] Query executed: ${rows.length} rows in ${executionTime}ms`)

    const response: any = {
      status: 'success',
      query,
      rowCount: rows.length,
      executionTimeMs: executionTime,
      sampleData: rows.slice(0, 10),
    }

    // Get AI analysis if requested and available
    if (includeAnalysis && rows.length > 0) {
      try {
        const analyzer = getOpenAIAnalyzer()
        console.log('[Test Query] Getting OpenAI analysis...')

        const analysis = await analyzer.analyzeQueryResult(
          question || 'Analyze this query result',
          {
            rows,
            rowCount: rows.length,
            executionTime,
          },
          query
        )

        if (analysis) {
          response.analysis = analysis
          console.log('[Test Query] Analysis completed')
        } else {
          response.analysisNote = 'OpenAI analysis not available'
        }
      } catch (analysisError) {
        console.error('[Test Query] Analysis failed:', analysisError)
        response.analysisError = analysisError instanceof Error ? analysisError.message : String(analysisError)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Test Query] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : 'Unknown',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Example queries
  const examples = {
    pubDataCount: {
      description: 'Count records in pub_data table',
      query: 'SELECT COUNT(*) as total_records FROM `gcpp-check.GI_publisher.pub_data` LIMIT 1',
      question: 'How many records are in the pub_data table?',
    },
    pubDataSchema: {
      description: 'Get schema info from pub_data table',
      query: 'SELECT * FROM `gcpp-check.GI_publisher.pub_data` LIMIT 5',
      question: 'What columns are in the pub_data table?',
    },
    revenueByDate: {
      description: 'Revenue by date (last 10 dates)',
      query: `SELECT
        date,
        SUM(rev) as total_revenue,
        SUM(paid) as total_impressions,
        ROUND(SAFE_DIVIDE(SUM(rev), SUM(paid)) * 1000, 2) as rpm
      FROM \`gcpp-check.GI_publisher.pub_data\`
      WHERE date IS NOT NULL
      GROUP BY date
      ORDER BY date DESC
      LIMIT 10`,
      question: 'What is the revenue trend over time?',
    },
    revenueByPublisher: {
      description: 'Top 10 publishers by revenue',
      query: `SELECT
        pid,
        pubname,
        SUM(rev) as total_revenue,
        COUNT(*) as record_count
      FROM \`gcpp-check.GI_publisher.pub_data\`
      WHERE pubname IS NOT NULL
      GROUP BY pid, pubname
      ORDER BY total_revenue DESC
      LIMIT 10`,
      question: 'Which publishers generate the most revenue?',
    },
    genieeAiTables: {
      description: 'Check if geniee_ai tables exist',
      query: `SELECT
        table_name,
        row_count,
        size_bytes
      FROM \`gcpp-check.geniee_ai.__TABLES__\`
      LIMIT 10`,
      question: 'What tables are in the geniee_ai dataset?',
    },
  }

  const example = searchParams.get('example') as keyof typeof examples

  if (example && examples[example]) {
    return NextResponse.json({
      status: 'example',
      ...examples[example],
      instruction: 'POST this query to test endpoint with: { query, question, includeAnalysis: true }',
    })
  }

  return NextResponse.json({
    status: 'test_endpoint',
    description: 'Test BigQuery queries with optional OpenAI analysis',
    usage: {
      method: 'POST',
      url: '/api/test/query',
      body: {
        query: 'SELECT ... FROM table',
        question: 'Optional: What do you want to know?',
        includeAnalysis: 'true/false - Get OpenAI analysis (default: true)',
      },
    },
    availableExamples: Object.keys(examples),
    exampleUrl: 'Add ?example=pubDataCount to get example queries',
    examples,
  })
}
