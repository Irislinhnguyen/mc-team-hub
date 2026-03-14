/**
 * BigQuery Health Check Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    console.log('[BigQuery Health] Running health check')

    const isConnected = await BigQueryService.testConnection()

    if (isConnected) {
      return NextResponse.json(
        {
          status: 'ok',
          message: 'BigQuery connection successful',
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: 'BigQuery connection failed',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[BigQuery Health] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
