import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { getNewSalesQueries } from '../../../../lib/services/analyticsQueries'
import { getTeamsWithPics } from '../../../../lib/utils/teamMatcher'

// Helper function to map PIC to team and aggregate
function mapPicToTeamAndAggregate(data: any[]) {
  return async () => {
    if (!data || data.length === 0) return []

    // Fetch PIC-team mappings from Supabase
    const teamsWithPics = await getTeamsWithPics()
    const picToTeamMap = new Map<string, string>()
    const picToTeamMapCaseInsensitive = new Map<string, string>()

    teamsWithPics.forEach(({ team, pics }) => {
      pics.forEach(pic => {
        picToTeamMap.set(pic, team.team_id)
        // Also add lowercase version for case-insensitive lookup
        picToTeamMapCaseInsensitive.set(pic.toLowerCase(), team.team_id)
      })
    })

    console.log('[Mapping] PIC-to-Team map:', Object.fromEntries(picToTeamMap))
    const uniquePics = [...new Set(data.map(row => row.pic).filter(pic => pic != null))]
    console.log('[Mapping] Unique PICs in data:', uniquePics)

    // Check for unmapped PICs
    const unmappedPics = uniquePics.filter(pic =>
      pic && !picToTeamMap.has(pic) && !picToTeamMapCaseInsensitive.has(pic.toLowerCase())
    )
    if (unmappedPics.length > 0) {
      console.warn('[Mapping] WARNING: Unmapped PICs found (will be marked as UNKNOWN):', unmappedPics)
    }

    // Group by team and aggregate
    const teamDataMap = new Map<string, any>()

    data.forEach(row => {
      // Skip rows with null/undefined PIC
      if (!row.pic) {
        console.warn('[Mapping] Skipping row with null PIC:', row)
        return
      }

      // Try exact match first, then case-insensitive
      const team = picToTeamMap.get(row.pic) ||
                   picToTeamMapCaseInsensitive.get(row.pic.toLowerCase()) ||
                   'UNKNOWN'
      const key = `${team}_${row.year}_${row.month}`

      if (!teamDataMap.has(key)) {
        teamDataMap.set(key, {
          team,
          year: row.year,
          month: row.month,
          total_revenue: 0,
          total_profit: 0
        })
      }

      const teamRow = teamDataMap.get(key)!
      if (row.total_revenue !== undefined) {
        teamRow.total_revenue += parseFloat(row.total_revenue) || 0
      }
      if (row.total_profit !== undefined) {
        teamRow.total_profit += parseFloat(row.total_profit) || 0
      }
    })

    const result = Array.from(teamDataMap.values())
    const uniqueTeams = [...new Set(result.map(row => row.team))]
    console.log('[Mapping] Final teams in aggregated data:', uniqueTeams)

    return result
  }
}

// Helper function to map PIC to team for site counts (preserves year/month grouping)
function mapPicToTeamForSiteCounts(data: any[]) {
  return async () => {
    if (!data || data.length === 0) return []

    const teamsWithPics = await getTeamsWithPics()
    const picToTeamMap = new Map<string, string>()
    const picToTeamMapCaseInsensitive = new Map<string, string>()

    teamsWithPics.forEach(({ team, pics }) => {
      pics.forEach(pic => {
        picToTeamMap.set(pic, team.team_id)
        picToTeamMapCaseInsensitive.set(pic.toLowerCase(), team.team_id)
      })
    })

    const uniquePics = [...new Set(data.map(row => row.pic).filter(pic => pic != null))]

    // Check for unmapped PICs
    const unmappedPics = uniquePics.filter(pic =>
      pic && !picToTeamMap.has(pic) && !picToTeamMapCaseInsensitive.has(pic.toLowerCase())
    )
    if (unmappedPics.length > 0) {
      console.warn('[SiteCountMapping] WARNING: Unmapped PICs found (will be marked as UNKNOWN):', unmappedPics)
    }

    // Map each row's team from BigQuery to Supabase team_id
    const result = data.map(row => ({
      ...row,
      team: row.pic ?
        (picToTeamMap.get(row.pic) ||
         picToTeamMapCaseInsensitive.get(row.pic.toLowerCase()) ||
         'UNKNOWN') :
        'UNKNOWN'
    }))

    const uniqueTeams = [...new Set(result.map(row => row.team))]
    console.log('[SiteCountMapping] Final teams in mapped data:', uniqueTeams)

    return result
  }
}

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()

    console.log('[New Sales API] Received filters:', filters)

    // Get queries for New Sales page
    const queries = await getNewSalesQueries(filters)

    console.log('[New Sales API] Executing queries...')

    // Execute all queries in parallel
    const [
      allNewSales,
      summaryTimeSeriesRaw,
      summaryRevenueRaw,
      summaryProfitRaw,
      salesCsBreakdown,
      salesCsBreakdownTotals,
      salesCsBreakdownGrouped,
      salesCsSiteCounts,
      salesCsSiteDetails,
    ] = await Promise.all([
      BigQueryService.executeQuery(queries.allNewSales),
      BigQueryService.executeQuery(queries.summaryTimeSeries),
      BigQueryService.executeQuery(queries.summaryRevenue),
      BigQueryService.executeQuery(queries.summaryProfit),
      BigQueryService.executeQuery(queries.salesCsBreakdown),
      BigQueryService.executeQuery(queries.salesCsBreakdownTotals),
      BigQueryService.executeQuery(queries.salesCsBreakdownGrouped),
      BigQueryService.executeQuery(queries.salesCsSiteCounts),
      BigQueryService.executeQuery(queries.salesCsSiteDetails),
    ])

    console.log('[New Sales API] Query execution complete')
    console.log('[New Sales API] Mapping PICs to teams...')
    console.log('[New Sales API] Raw data before mapping:')
    console.log('  - summaryTimeSeriesRaw rows:', summaryTimeSeriesRaw.length)
    console.log('  - summaryRevenueRaw rows:', summaryRevenueRaw.length)
    console.log('  - summaryProfitRaw rows:', summaryProfitRaw.length)
    console.log('[New Sales API] Sample raw revenue data:', JSON.stringify(summaryRevenueRaw.slice(0, 5), null, 2))

    // Map PIC to team and aggregate for summary queries
    const [summaryTimeSeries, summaryRevenue, summaryProfit, salesCsBreakdownMapped, salesCsBreakdownGroupedMapped, salesCsSiteDetailsMapped] = await Promise.all([
      mapPicToTeamAndAggregate(summaryTimeSeriesRaw)(),
      mapPicToTeamAndAggregate(summaryRevenueRaw)(),
      mapPicToTeamAndAggregate(summaryProfitRaw)(),
      mapPicToTeamForSiteCounts(salesCsBreakdown)(),
      mapPicToTeamForSiteCounts(salesCsBreakdownGrouped)(),
      mapPicToTeamForSiteCounts(salesCsSiteDetails)(),
    ])

    console.log('[New Sales API] salesCsBreakdown RAW sample (before mapping):', salesCsBreakdown.slice(0, 3).map(r => ({ pic: r.pic, pid: r.pid })))

    // Helper function to format month as "Mon YYYY"
    const formatMonthYear = (year: number, month: number) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[month - 1]} ${year}`
    }

    // Transform salesCsBreakdown to salesCsSiteCountsByPic format
    // Each row becomes a site with sales_month/cs_month based on revenue distribution
    const salesCsSiteCountsByPic = salesCsBreakdownMapped.map(row => {
      // Determine sales_month and cs_month based on whether the site has sales_rev or cs_rev
      // If sales_rev > 0, this month is a sales_month
      // If cs_rev > 0 (and sales_rev = 0), this month is a cs_month
      const hasSales = parseFloat(row.sales_rev || 0) > 0
      const hasCs = parseFloat(row.cs_rev || 0) > 0
      const monthStr = formatMonthYear(row.year, row.month)

      return {
        team: row.team,
        pic: row.pic,
        pid: row.pid,
        pubname: row.pubname,
        start_date: row.start_date,
        end_date: row.end_date,
        sales_month: hasSales ? monthStr : null,
        cs_month: hasCs && !hasSales ? monthStr : null,
        year: row.year,
        month: row.month,
      }
    })

    // Also compute salesCsSiteCountsByTeam by aggregating salesCsSiteCountsByPic
    const salesCsSiteCountsByTeam = new Map<string, { team: string; total_sales_sites: number; total_cs_sites: number }>()
    salesCsSiteCountsByPic.forEach(row => {
      const monthKey = `${row.year}-${row.month}`
      if (!salesCsSiteCountsByTeam.has(monthKey)) {
        salesCsSiteCountsByTeam.set(monthKey, {
          team: row.team,
          total_sales_sites: 0,
          total_cs_sites: 0,
        })
      }
      const counts = salesCsSiteCountsByTeam.get(monthKey)!
      if (row.sales_month) counts.total_sales_sites += 1
      if (row.cs_month) counts.total_cs_sites += 1
    })

    console.log('[New Sales API] Mapping complete')
    return NextResponse.json({
      status: 'ok',
      data: {
        allNewSales,
        summaryTimeSeries,
        summaryRevenue,
        summaryProfit,
        salesCsBreakdown: salesCsBreakdownMapped,
        salesCsBreakdownGrouped: salesCsBreakdownGroupedMapped,
        salesCsBreakdownTotals: salesCsBreakdownTotals[0] || {
          total_sales_rev: 0,
          total_sales_profit: 0,
          total_cs_rev: 0,
          total_cs_profit: 0,
        },
        salesCsSiteCountsByPic: salesCsSiteCountsByPic,
        salesCsSiteCountsByTeam: Array.from(salesCsSiteCountsByTeam.values()),
        salesCsSiteDetails: salesCsSiteDetailsMapped,
      },
    })
  } catch (error) {
    console.error('[New Sales API] Error fetching new sales data:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
