/**
 * Cascading Filter API: PID → MID
 * Returns distinct MIDs that belong to selected PIDs
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../lib/services/bigquery'

// In-memory cache with TTL
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CachedData {
  data: Array<{ label: string; value: string }>
  timestamp: number
}

const cache = new Map<string, CachedData>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pidsParam = searchParams.get('pids')

    if (!pidsParam) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing pids parameter. Usage: ?pids=123,456',
        },
        { status: 400 }
      )
    }

    const pids = pidsParam.split(',').map((p) => p.trim()).filter(Boolean)

    if (pids.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'No valid PIDs provided',
        },
        { status: 400 }
      )
    }

    const cacheKey = pids.sort().join('|')

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[mids-for-pids] Cache hit for ${pids.length} PIDs`)
      return NextResponse.json({
        status: 'ok',
        data: cached.data,
        fromCache: true,
        pidsCount: pids.length,
      })
    }

    // Query BigQuery
    const pidFilter = pids.map((pid) => `'${pid.replace(/'/g, "\\'")}'`).join(', ')
    const query = `
      SELECT DISTINCT mid
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE pid IN (${pidFilter})
        AND mid IS NOT NULL
      ORDER BY mid
    `

    console.log(`[mids-for-pids] Querying BigQuery for ${pids.length} PIDs`)
    const results = await BigQueryService.executeQuery(query)

    const mids = results.map((r: any) => ({
      label: String(r.mid || ''),
      value: String(r.mid || ''),
    }))

    // Cache result
    cache.set(cacheKey, {
      data: mids,
      timestamp: Date.now(),
    })

    console.log(`[mids-for-pids] Found ${mids.length} MIDs for ${pids.length} PIDs`)

    return NextResponse.json({
      status: 'ok',
      data: mids,
      fromCache: false,
      pidsCount: pids.length,
      midsCount: mids.length,
    })
  } catch (error) {
    console.error('[mids-for-pids] Error fetching MIDs:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
