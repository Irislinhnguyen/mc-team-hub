/**
 * Cascading Filter API: ZID → Zonename
 * Returns distinct zonenames that belong to selected ZIDs
 * Since 1 ZID = 1 zonename, this returns the names of selected ZIDs
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
    const zidsParam = searchParams.get('zids')

    if (!zidsParam) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing zids parameter. Usage: ?zids=123,456',
        },
        { status: 400 }
      )
    }

    const zids = zidsParam.split(',').map((z) => z.trim()).filter(Boolean)

    if (zids.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'No valid ZIDs provided',
        },
        { status: 400 }
      )
    }

    const cacheKey = zids.sort().join('|')

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[zonenames-for-zids] Cache hit for ${zids.length} ZIDs`)
      return NextResponse.json({
        status: 'ok',
        data: cached.data,
        fromCache: true,
        zidsCount: zids.length,
      })
    }

    // Query BigQuery
    const zidFilter = zids.map((zid) => `'${zid.replace(/'/g, "\\'")}'`).join(', ')
    const query = `
      SELECT DISTINCT zonename
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE zid IN (${zidFilter})
        AND zonename IS NOT NULL
      ORDER BY zonename
    `

    console.log(`[zonenames-for-zids] Querying BigQuery for ${zids.length} ZIDs`)
    const results = await BigQueryService.executeQuery(query)

    const zonenames = results.map((r: any) => ({
      label: String(r.zonename || ''),
      value: String(r.zonename || ''),
    }))

    // Cache result
    cache.set(cacheKey, {
      data: zonenames,
      timestamp: Date.now(),
    })

    console.log(`[zonenames-for-zids] Found ${zonenames.length} zonenames for ${zids.length} ZIDs`)

    return NextResponse.json({
      status: 'ok',
      data: zonenames,
      fromCache: false,
      zidsCount: zids.length,
      zonenamesCount: zonenames.length,
    })
  } catch (error) {
    console.error('[zonenames-for-zids] Error fetching zonenames:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
