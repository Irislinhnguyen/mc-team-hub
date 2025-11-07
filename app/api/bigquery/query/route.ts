/**
 * BigQuery Query Execution Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

interface QueryRequest {
  query: string
  parameters?: any[]
}

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json()
    const { query, parameters } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('[BigQuery Query] Executing query')

    const results = await BigQueryService.executeQuery(query, parameters)

    return NextResponse.json(
      {
        status: 'ok',
        rows: results,
        count: results.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[BigQuery Query] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
