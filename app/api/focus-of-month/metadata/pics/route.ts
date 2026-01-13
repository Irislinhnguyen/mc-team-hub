/**
 * Focus of the Month - PICs Metadata
 * GET - Fetch distinct PICs from BigQuery
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import BigQueryService from '@/lib/services/bigquery'

// In-memory cache for PICs
let cachedPics: any = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for cache-busting parameter
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Check cache first (unless force refresh)
    if (!forceRefresh && cachedPics && Date.now() - cacheTimestamp < CACHE_TTL) {
      console.log('[Focus Metadata] Returning cached PICs')
      return NextResponse.json({
        status: 'ok',
        data: cachedPics,
        fromCache: true,
      })
    }

    if (forceRefresh) {
      console.log('[Focus Metadata] Force refresh requested for PICs, bypassing cache')
    }

    console.log('[Focus Metadata] Cache miss or expired, fetching PICs from BigQuery...')

    // Query BigQuery for distinct PICs
    const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'
    const query = `
      SELECT DISTINCT pic
      FROM ${tableName}
      WHERE pic IS NOT NULL
        AND pic != ''
      ORDER BY pic ASC
    `

    const result = await BigQueryService.executeQuery(query)

    const pics = result.map((row: any) => ({
      label: row.pic,
      value: row.pic,
    }))

    // Cache the PICs
    cachedPics = pics
    cacheTimestamp = Date.now()
    console.log('[Focus Metadata] PICs fetched and cached from BigQuery')

    return NextResponse.json({
      status: 'ok',
      data: pics,
      fromCache: false,
    })
  } catch (error) {
    console.error('[Focus Metadata] Error fetching PICs:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch PICs',
      },
      { status: 500 }
    )
  }
}
