import { NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { getTeamsWithPics } from '../../../../lib/utils/teamMatcher'

export async function GET() {
  try {
    console.log('\n=== PIC-TEAM MAPPING DIAGNOSTIC ===\n')

    // 1. Get all unique PICs from BigQuery
    const picQuery = `
      SELECT DISTINCT pic
      FROM \`gcpp-check.GI_publisher.final_sales_monthly\`
      WHERE pic IS NOT NULL
      ORDER BY pic
    `
    const bigqueryPics = await BigQueryService.executeQuery(picQuery)
    const picList = bigqueryPics.map((row: any) => row.pic)

    console.log('PICs in BigQuery:', picList)

    // 2. Get revenue by PIC
    const revenueQuery = `
      SELECT
        pic,
        COUNT(DISTINCT CONCAT(year, '-', month)) as month_count,
        SUM(total_revenue) as total_revenue,
        SUM(total_profit) as total_profit
      FROM \`gcpp-check.GI_publisher.final_sales_monthly\`
      WHERE pic IS NOT NULL
      GROUP BY pic
      ORDER BY total_revenue DESC
    `
    const revenueByPic = await BigQueryService.executeQuery(revenueQuery)

    console.log('Revenue by PIC:', revenueByPic)

    // 3. Get team mappings from Supabase
    const teamsWithPics = await getTeamsWithPics()
    const picToTeamMap = new Map<string, string>()

    teamsWithPics.forEach(({ team, pics }) => {
      pics.forEach(pic => {
        picToTeamMap.set(pic, team.team_id)
      })
    })

    console.log('PIC-to-Team map:', Object.fromEntries(picToTeamMap))

    // 4. Find unmapped PICs
    const unmappedPics = picList.filter(pic => !picToTeamMap.has(pic))

    console.log('Unmapped PICs:', unmappedPics)

    // 5. Group revenue by team
    const revenueByTeam = new Map<string, { revenue: number; profit: number; picCount: number }>()

    revenueByPic.forEach((row: any) => {
      const team = picToTeamMap.get(row.pic) || 'UNKNOWN'

      if (!revenueByTeam.has(team)) {
        revenueByTeam.set(team, { revenue: 0, profit: 0, picCount: 0 })
      }

      const teamData = revenueByTeam.get(team)!
      teamData.revenue += parseFloat(row.total_revenue || 0)
      teamData.profit += parseFloat(row.total_profit || 0)
      teamData.picCount += 1
    })

    const teamSummary = Array.from(revenueByTeam.entries()).map(([team, data]) => ({
      team,
      ...data
    })).sort((a, b) => b.revenue - a.revenue)

    console.log('Revenue by Team:', teamSummary)

    return NextResponse.json({
      status: 'ok',
      data: {
        totalPicsInBigQuery: picList.length,
        totalTeamsInSupabase: teamsWithPics.length,
        totalMappedPics: picToTeamMap.size,
        unmappedPicsCount: unmappedPics.length,
        picsInBigQuery: picList,
        teamsWithPics: teamsWithPics.map(({ team, pics }) => ({
          team_id: team.team_id,
          team_name: team.team_name,
          pics
        })),
        unmappedPics,
        revenueByPic,
        revenueByTeam: teamSummary,
        picToTeamMap: Object.fromEntries(picToTeamMap)
      }
    })
  } catch (error) {
    console.error('Error in diagnostic:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
