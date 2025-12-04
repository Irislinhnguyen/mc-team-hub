/**
 * Cascading Filter API: PIC → PID
 * Returns distinct PIDs that belong to selected PICs
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../lib/services/bigquery'

// In-memory cache: Map<sorted PIC string, PID[]>
const pidCache = new Map<string, Array<{ label: string; value: string }>>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CachedData {
  data: Array<{ label: string; value: string }>
  timestamp: number
}

const cache = new Map<string, CachedData>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const picsParam = searchParams.get('pics')

    if (!picsParam) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing pics parameter. Usage: ?pics=John,Jane',
        },
        { status: 400 }
      )
    }

    const pics = picsParam.split(',').map((p) => p.trim()).filter(Boolean)

    if (pics.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'No valid PICs provided',
        },
        { status: 400 }
      )
    }

    const cacheKey = pics.sort().join('|')

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[pids-for-pics] Cache hit for ${pics.length} PICs`)
      return NextResponse.json({
        status: 'ok',
        data: cached.data,
        fromCache: true,
        picsCount: pics.length,
      })
    }

    // Query BigQuery
    const picFilter = pics.map((pic) => `'${pic.replace(/'/g, "\\'")}'`).join(', ')
    const query = `
      SELECT DISTINCT pid
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE pic IN (${picFilter})
        AND pid IS NOT NULL
      ORDER BY pid
    `

    console.log(`[pids-for-pics] Querying BigQuery for ${pics.length} PICs`)
    const results = await BigQueryService.executeQuery(query)

    const pids = results.map((r: any) => ({
      label: String(r.pid || ''),
      value: String(r.pid || ''),
    }))

    // Cache result
    cache.set(cacheKey, {
      data: pids,
      timestamp: Date.now(),
    })

    console.log(`[pids-for-pics] Found ${pids.length} PIDs for ${pics.length} PICs`)

    return NextResponse.json({
      status: 'ok',
      data: pids,
      fromCache: false,
      picsCount: pics.length,
      pidsCount: pids.length,
    })
  } catch (error) {
    console.error('[pids-for-pics] Error fetching PIDs:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
