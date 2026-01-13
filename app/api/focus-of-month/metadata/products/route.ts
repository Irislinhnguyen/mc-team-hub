/**
 * Focus of the Month - Products Metadata
 * GET - Fetch distinct products from BigQuery
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import BigQueryService from '@/lib/services/bigquery'

// In-memory cache for products
let cachedProducts: any = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

// Helper to format product name (e.g., "flexiblesticky" -> "Flexible Sticky")
function formatProductName(product: string): string {
  return product
    .split(/(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

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
    if (!forceRefresh && cachedProducts && Date.now() - cacheTimestamp < CACHE_TTL) {
      console.log('[Focus Metadata] Returning cached products')
      return NextResponse.json({
        status: 'ok',
        data: cachedProducts,
        fromCache: true,
      })
    }

    if (forceRefresh) {
      console.log('[Focus Metadata] Force refresh requested, bypassing cache')
    }

    console.log('[Focus Metadata] Cache miss or expired, fetching products from BigQuery...')

    // Query BigQuery for distinct products
    const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'
    const query = `
      SELECT DISTINCT product
      FROM ${tableName}
      WHERE product IS NOT NULL
        AND product != ''
      ORDER BY product ASC
    `

    const result = await BigQueryService.executeQuery(query)

    const products = result.map((row: any) => ({
      label: formatProductName(row.product),
      value: row.product,
    }))

    // Cache the products
    cachedProducts = products
    cacheTimestamp = Date.now()
    console.log('[Focus Metadata] Products fetched and cached from BigQuery')

    return NextResponse.json({
      status: 'ok',
      data: products,
      fromCache: false,
    })
  } catch (error) {
    console.error('[Focus Metadata] Error fetching products:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch products',
      },
      { status: 500 }
    )
  }
}
