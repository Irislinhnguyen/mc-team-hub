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

    // Fetch all unique values for each filter dimension
    const mediaTable = '`gcpp-check.GI_publisher.media_summary_dashboard`'
    const closeWonTable = '`gcpp-check.GI_publisher.close_won_cases`'

    const [pics, products, pids, mids, pubnames, medianames, zids, zonenames, revFlags, revenueTiers, months, years, teamConfig,
      picToPid, pidToMid, midToZid, zidToProduct, pidToPubname, midToMedianame, zidToZonename] = await Promise.all([
      // Original distinct queries
      executeQueryWithTimeout(`SELECT DISTINCT pic FROM ${tableName} WHERE pic IS NOT NULL ORDER BY pic`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT product FROM ${tableName} WHERE product IS NOT NULL ORDER BY product`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT pid FROM ${tableName} WHERE pid IS NOT NULL ORDER BY pid`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT mid FROM ${tableName} WHERE mid IS NOT NULL ORDER BY mid`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT pubname FROM ${tableName} WHERE pubname IS NOT NULL ORDER BY pubname`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT medianame FROM ${tableName} WHERE medianame IS NOT NULL ORDER BY medianame`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT zid FROM ${tableName} WHERE zid IS NOT NULL ORDER BY zid`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT zonename FROM ${tableName} WHERE zonename IS NOT NULL ORDER BY zonename`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT rev_flag FROM ${topMoversTable} WHERE rev_flag IS NOT NULL ORDER BY rev_flag`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT revenue_tier FROM ${mediaTable} WHERE revenue_tier IS NOT NULL ORDER BY revenue_tier`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT month FROM ${closeWonTable} WHERE month IS NOT NULL ORDER BY month ASC`, 15000),
      executeQueryWithTimeout(`SELECT DISTINCT year FROM ${closeWonTable} WHERE year IS NOT NULL ORDER BY year DESC`, 15000),
      getTeamConfigurations(),

      // NEW: Relationship map queries
      executeQueryWithTimeout(`
        SELECT pic, ARRAY_AGG(DISTINCT pid IGNORE NULLS) as pids
        FROM ${tableName}
        WHERE pic IS NOT NULL AND pid IS NOT NULL
        GROUP BY pic
      `, 20000),

      executeQueryWithTimeout(`
        SELECT pid, ARRAY_AGG(DISTINCT mid IGNORE NULLS) as mids
        FROM ${tableName}
        WHERE pid IS NOT NULL AND mid IS NOT NULL
        GROUP BY pid
      `, 20000),

      executeQueryWithTimeout(`
        SELECT mid, ARRAY_AGG(DISTINCT zid IGNORE NULLS) as zids
        FROM ${tableName}
        WHERE mid IS NOT NULL AND zid IS NOT NULL
        GROUP BY mid
      `, 20000),

      executeQueryWithTimeout(`
        SELECT zid, ARRAY_AGG(DISTINCT product IGNORE NULLS) as products
        FROM ${tableName}
        WHERE zid IS NOT NULL AND product IS NOT NULL
        GROUP BY zid
      `, 20000),

      executeQueryWithTimeout(`
        SELECT pid, ARRAY_AGG(DISTINCT pubname IGNORE NULLS) as pubnames
        FROM ${tableName}
        WHERE pid IS NOT NULL AND pubname IS NOT NULL
        GROUP BY pid
      `, 20000),

      executeQueryWithTimeout(`
        SELECT mid, ARRAY_AGG(DISTINCT medianame IGNORE NULLS) as medianames
        FROM ${tableName}
        WHERE mid IS NOT NULL AND medianame IS NOT NULL
        GROUP BY mid
      `, 20000),

      executeQueryWithTimeout(`
        SELECT zid, ARRAY_AGG(DISTINCT zonename IGNORE NULLS) as zonenames
        FROM ${tableName}
        WHERE zid IS NOT NULL AND zonename IS NOT NULL
        GROUP BY zid
      `, 20000),
    ])

    // Format the metadata
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    // Build relationship maps (forward mappings)
    const picToPidMap: Record<string, string[]> = {}
    picToPid.forEach((row: any) => {
      picToPidMap[row.pic] = (row.pids || []).map(String)
    })

    const pidToMidMap: Record<string, string[]> = {}
    pidToMid.forEach((row: any) => {
      pidToMidMap[String(row.pid)] = row.mids?.map(String) || []
    })

    const midToZidMap: Record<string, string[]> = {}
    midToZid.forEach((row: any) => {
      midToZidMap[String(row.mid)] = row.zids?.map(String) || []
    })

    const zidToProductMap: Record<string, string[]> = {}
    zidToProduct.forEach((row: any) => {
      zidToProductMap[String(row.zid)] = (row.products || []).map(String)
    })

    const pidToPubnameMap: Record<string, string[]> = {}
    pidToPubname.forEach((row: any) => {
      pidToPubnameMap[String(row.pid)] = (row.pubnames || []).map(String)
    })

    const midToMedianameMap: Record<string, string[]> = {}
    midToMedianame.forEach((row: any) => {
      midToMedianameMap[String(row.mid)] = (row.medianames || []).map(String)
    })

    const zidToZonenameMap: Record<string, string[]> = {}
    zidToZonename.forEach((row: any) => {
      zidToZonenameMap[String(row.zid)] = (row.zonenames || []).map(String)
    })

    // Build reverse mappings (for efficient lookups)
    const pubnameToPidMap: Record<string, string[]> = {}
    Object.entries(pidToPubnameMap).forEach(([pid, pubnames]) => {
      pubnames.forEach((pubname) => {
        if (!pubnameToPidMap[pubname]) pubnameToPidMap[pubname] = []
        pubnameToPidMap[pubname].push(pid)
      })
    })

    const medianameToMidMap: Record<string, string[]> = {}
    Object.entries(midToMedianameMap).forEach(([mid, medianames]) => {
      medianames.forEach((medianame) => {
        if (!medianameToMidMap[medianame]) medianameToMidMap[medianame] = []
        medianameToMidMap[medianame].push(mid)
      })
    })

    const zonenameToZidMap: Record<string, string[]> = {}
    Object.entries(zidToZonenameMap).forEach(([zid, zonenames]) => {
      zonenames.forEach((zonename) => {
        if (!zonenameToZidMap[zonename]) zonenameToZidMap[zonename] = []
        zonenameToZidMap[zonename].push(zid)
      })
    })

    const productToZidMap: Record<string, string[]> = {}
    Object.entries(zidToProductMap).forEach(([zid, products]) => {
      products.forEach((product) => {
        if (!productToZidMap[product]) productToZidMap[product] = []
        productToZidMap[product].push(zid)
      })
    })

    // Build reverse ID mappings
    const pidToPicMap: Record<string, string[]> = {}
    Object.entries(picToPidMap).forEach(([pic, pids]) => {
      pids.forEach((pid) => {
        if (!pidToPicMap[pid]) pidToPicMap[pid] = []
        pidToPicMap[pid].push(pic)
      })
    })

    const midToPidMap: Record<string, string[]> = {}
    Object.entries(pidToMidMap).forEach(([pid, mids]) => {
      mids.forEach((mid) => {
        if (!midToPidMap[mid]) midToPidMap[mid] = []
        midToPidMap[mid].push(pid)
      })
    })

    const zidToMidMap: Record<string, string[]> = {}
    Object.entries(midToZidMap).forEach(([mid, zids]) => {
      zids.forEach((zid) => {
        if (!zidToMidMap[zid]) zidToMidMap[zid] = []
        zidToMidMap[zid].push(mid)
      })
    })

    // Build team to PIC mapping
    const teamToPicMap: Record<string, string[]> = {}
    teamConfig.teams.forEach((team: any) => {
      teamToPicMap[team.team_id] = team.pic_ids || []
    })

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

      // Relationship maps for Looker Studio-style cascading
      relationships: {
        // Forward ID mappings
        picToPid: picToPidMap,
        pidToMid: pidToMidMap,
        midToZid: midToZidMap,
        zidToProduct: zidToProductMap,

        // Name field mappings
        pidToPubname: pidToPubnameMap,
        midToMedianame: midToMedianameMap,
        zidToZonename: zidToZonenameMap,

        // Reverse name → ID mappings
        pubnameToPid: pubnameToPidMap,
        medianameToMid: medianameToMidMap,
        zonenameToZid: zonenameToZidMap,
        productToZid: productToZidMap,

        // Reverse ID mappings
        pidToPic: pidToPicMap,
        midToPid: midToPidMap,
        zidToMid: zidToMidMap,

        // Team mappings
        teamToPic: teamToPicMap,
      },
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
