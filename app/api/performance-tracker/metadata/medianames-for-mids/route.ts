/**
 * Cascading Filter API: MID → Medianame
 * Returns distinct medianames that belong to selected MIDs
 * Since 1 MID = 1 medianame, this returns the names of selected MIDs
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
    const midsParam = searchParams.get('mids')

    if (!midsParam) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing mids parameter. Usage: ?mids=123,456',
        },
        { status: 400 }
      )
    }

    const mids = midsParam.split(',').map((m) => m.trim()).filter(Boolean)

    if (mids.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'No valid MIDs provided',
        },
        { status: 400 }
      )
    }

    const cacheKey = mids.sort().join('|')

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[medianames-for-mids] Cache hit for ${mids.length} MIDs`)
      return NextResponse.json({
        status: 'ok',
        data: cached.data,
        fromCache: true,
        midsCount: mids.length,
      })
    }

    // Query BigQuery
    const midFilter = mids.map((mid) => `'${mid.replace(/'/g, "\\'")}'`).join(', ')
    const query = `
      SELECT DISTINCT medianame
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE mid IN (${midFilter})
        AND medianame IS NOT NULL
      ORDER BY medianame
    `

    console.log(`[medianames-for-mids] Querying BigQuery for ${mids.length} MIDs`)
    const results = await BigQueryService.executeQuery(query)

    const medianames = results.map((r: any) => ({
      label: String(r.medianame || ''),
      value: String(r.medianame || ''),
    }))

    // Cache result
    cache.set(cacheKey, {
      data: medianames,
      timestamp: Date.now(),
    })

    console.log(`[medianames-for-mids] Found ${medianames.length} medianames for ${mids.length} MIDs`)

    return NextResponse.json({
      status: 'ok',
      data: medianames,
      fromCache: false,
      midsCount: mids.length,
      medianamesCount: medianames.length,
    })
  } catch (error) {
    console.error('[medianames-for-mids] Error fetching medianames:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
