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
    ] = await Promise.all([
      BigQueryService.executeQuery(queries.allNewSales),
      BigQueryService.executeQuery(queries.summaryTimeSeries),
      BigQueryService.executeQuery(queries.summaryRevenue),
      BigQueryService.executeQuery(queries.summaryProfit),
      BigQueryService.executeQuery(queries.salesCsBreakdown),
      BigQueryService.executeQuery(queries.salesCsBreakdownTotals),
      BigQueryService.executeQuery(queries.salesCsBreakdownGrouped),
    ])

    console.log('[New Sales API] Query execution complete')
    console.log('[New Sales API] Mapping PICs to teams...')
    console.log('[New Sales API] Raw data before mapping:')
    console.log('  - summaryTimeSeriesRaw rows:', summaryTimeSeriesRaw.length)
    console.log('  - summaryRevenueRaw rows:', summaryRevenueRaw.length)
    console.log('  - summaryProfitRaw rows:', summaryProfitRaw.length)
    console.log('[New Sales API] Sample raw revenue data:', JSON.stringify(summaryRevenueRaw.slice(0, 5), null, 2))

    // Map PIC to team and aggregate for summary queries
    const [summaryTimeSeries, summaryRevenue, summaryProfit] = await Promise.all([
      mapPicToTeamAndAggregate(summaryTimeSeriesRaw)(),
      mapPicToTeamAndAggregate(summaryRevenueRaw)(),
      mapPicToTeamAndAggregate(summaryProfitRaw)(),
    ])

    console.log('[New Sales API] Mapping complete')
    console.log('[New Sales API] All New Sales rows:', allNewSales.length)
    console.log('[New Sales API] Summary Time Series rows (after mapping):', summaryTimeSeries.length)
    console.log('[New Sales API] Sample mapped revenue data:', JSON.stringify(summaryRevenue.slice(0, 5), null, 2))
    console.log('[New Sales API] Sales-CS Breakdown rows:', salesCsBreakdown.length)
    console.log('[New Sales API] Sales-CS Breakdown Grouped rows:', salesCsBreakdownGrouped.length)

    return NextResponse.json({
      status: 'ok',
      data: {
        allNewSales,
        summaryTimeSeries,
        summaryRevenue,
        summaryProfit,
        salesCsBreakdown,
        salesCsBreakdownGrouped,
        salesCsBreakdownTotals: salesCsBreakdownTotals[0] || {
          total_sales_rev: 0,
          total_sales_profit: 0,
          total_cs_rev: 0,
          total_cs_profit: 0,
        },
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
