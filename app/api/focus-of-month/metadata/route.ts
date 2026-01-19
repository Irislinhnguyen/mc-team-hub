/**
 * Focus of Month - Metadata API
 * GET - Returns metadata for advanced filter options (products, teams, pics)
 */

import { NextResponse } from 'next/server'
import BigQueryService from '@/lib/services/bigquery'
import { getTeamConfigurations } from '@/lib/utils/teamMatcher'

export async function GET() {
  try {
    // Get distinct products from BigQuery
    const productSql = `
      SELECT DISTINCT product
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE product IS NOT NULL AND product != ''
      ORDER BY product
    `

    const products = await BigQueryService.executeQuery(productSql)
    const productList = products.map((p: any) => p.product)

    // Get team configurations (includes teams and PICs)
    const teamConfig = await getTeamConfigurations()
    const teams = teamConfig.teams.map((t: any) => t.team_name || t.team_id)
    const pics = teamConfig.picMappings.map((m: any) => m.pic_name)

    return NextResponse.json({
      products: productList,
      teams,
      pics,
    })
  } catch (error) {
    console.error('[metadata] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load metadata' },
      { status: 500 }
    )
  }
}
