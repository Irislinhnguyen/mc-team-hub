import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { getTeamConfigurations } from '../../../../lib/utils/teamMatcher'

// In-memory cache for metadata
let cachedMetadata: any = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache

// Helper to run query with timeout
async function executeQueryWithTimeout(query: string, timeoutMs: number = 15000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const result = await BigQueryService.executeQuery(query)
    clearTimeout(timeoutId)
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (cachedMetadata && Date.now() - cacheTimestamp < CACHE_TTL) {
      console.log('[Metadata] Returning cached data')
      return NextResponse.json({
        status: 'ok',
        data: cachedMetadata,
        fromCache: true,
      })
    }

    console.log('[Metadata] Cache miss or expired, fetching from BigQuery...')
    const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'
    const topMoversTable = '`gcpp-check.GI_publisher.top_movers_daily`'

    // Fetch all unique values for each filter dimension with LIMIT
    // LIMIT 1000 is enough for filter dropdowns
    const mediaTable = '`gcpp-check.GI_publisher.media_summary_dashboard`'
    const closeWonTable = '`gcpp-check.GI_publisher.close_won_cases`'

    const [pics, products, pids, mids, pubnames, medianames, zids, zonenames, revFlags, revenueTiers, months, years, teamConfig] = await Promise.all([
      executeQueryWithTimeout(`SELECT DISTINCT pic FROM ${tableName} WHERE pic IS NOT NULL ORDER BY pic LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT product FROM ${tableName} WHERE product IS NOT NULL ORDER BY product LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT pid FROM ${tableName} WHERE pid IS NOT NULL ORDER BY pid LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT mid FROM ${tableName} WHERE mid IS NOT NULL ORDER BY mid LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT pubname FROM ${tableName} WHERE pubname IS NOT NULL ORDER BY pubname LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT medianame FROM ${tableName} WHERE medianame IS NOT NULL ORDER BY medianame LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT zid FROM ${tableName} WHERE zid IS NOT NULL ORDER BY zid LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT zonename FROM ${tableName} WHERE zonename IS NOT NULL ORDER BY zonename LIMIT 1000`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT rev_flag FROM ${topMoversTable} WHERE rev_flag IS NOT NULL ORDER BY rev_flag LIMIT 50`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT revenue_tier FROM ${mediaTable} WHERE revenue_tier IS NOT NULL ORDER BY revenue_tier LIMIT 10`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT month FROM ${closeWonTable} WHERE month IS NOT NULL ORDER BY month ASC LIMIT 12`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT year FROM ${closeWonTable} WHERE year IS NOT NULL ORDER BY year DESC LIMIT 10`, 15000),
      getTeamConfigurations(),
    ])

    // Format the metadata
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const formattedData = {
      pics: pics.map((p: any) => ({ label: p.pic || '', value: p.pic || '' })),
      products: products.map((p: any) => ({ label: p.product || '', value: p.product || '' })),
      pids: pids.map((p: any) => ({ label: String(p.pid || ''), value: String(p.pid || '') })),
      mids: mids.map((m: any) => ({ label: String(m.mid || ''), value: String(m.mid || '') })),
      pubnames: pubnames.map((p: any) => ({ label: p.pubname || '', value: p.pubname || '' })),
      medianames: medianames.map((m: any) => ({ label: m.medianame || '', value: m.medianame || '' })),
      zids: zids.map((z: any) => ({ label: String(z.zid || ''), value: String(z.zid || '') })),
      zonenames: zonenames.map((z: any) => ({ label: z.zonename || '', value: z.zonename || '' })),
      rev_flags: revFlags.map((r: any) => ({ label: r.rev_flag || '', value: r.rev_flag || '' })),
      revenue_tiers: revenueTiers.map((r: any) => ({ label: r.revenue_tier || '', value: r.revenue_tier || '' })),
      months: months.map((m: any) => ({ label: monthNames[m.month - 1] || String(m.month), value: String(m.month || '') })),
      years: years.map((y: any) => ({ label: String(y.year || ''), value: String(y.year || '') })),
      teams: teamConfig.teams.map((t: any) => ({ label: t.team_name, value: t.team_id })),
    }

    // Cache the metadata
    cachedMetadata = formattedData
    cacheTimestamp = Date.now()
    console.log('[Metadata] Data fetched and cached from BigQuery')

    return NextResponse.json({
      status: 'ok',
      data: formattedData,
      fromCache: false,
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
