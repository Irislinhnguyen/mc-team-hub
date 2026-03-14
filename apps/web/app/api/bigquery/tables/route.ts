/**
 * BigQuery Tables Endpoint
 * Get table info and list available tables
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')

    if (table) {
      // Get specific table info
      console.log(`[BigQuery Tables] Getting info for table: ${table}`)
      const info = await BigQueryService.getTableInfo(table)
      return NextResponse.json(info, { status: 200 })
    } else {
      // List all tables
      console.log('[BigQuery Tables] Listing all tables')
      const tables = await BigQueryService.listTables()
      return NextResponse.json({ tables }, { status: 200 })
    }
  } catch (error) {
    console.error('[BigQuery Tables] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
