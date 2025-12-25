import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// In-memory cache
let cachedPublishers: any[] = []
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * GET /api/pipelines/publisher-lookup
 * Returns unique publisher mappings from Supabase publisher_cache table
 * Fallback for fast autocomplete when BigQuery is loading
 * Cache is seeded from BigQuery via scripts/seed-publisher-cache.cjs
 */
export async function GET() {
  try {
    // Check in-memory cache first
    if (cachedPublishers.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({
        publishers: cachedPublishers,
        fromCache: true,
        count: cachedPublishers.length,
      })
    }

    const supabase = await createClient()

    // Query from publisher_cache table (seeded from BigQuery)
    const { data, error } = await supabase
      .from('publisher_cache')
      .select('pid, pubname, mid, medianame')
      .order('pubname')

    if (error) {
      console.error('Error fetching publisher cache:', error)
      return NextResponse.json(
        { error: 'Failed to fetch publishers' },
        { status: 500 }
      )
    }

    // Format publishers (already unique from cache table)
    const publishers = data.map((row) => ({
      pid: String(row.pid),
      pubname: row.pubname,
      mid: row.mid ? String(row.mid) : null,
      medianame: row.medianame || null,
    }))

    // Update in-memory cache
    cachedPublishers = publishers
    cacheTimestamp = Date.now()

    return NextResponse.json({
      publishers,
      fromCache: false,
      count: publishers.length,
    })
  } catch (error) {
    console.error('Publisher lookup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
