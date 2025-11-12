import { NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET() {
  try {
    // Fetch distinct filter options from BigQuery in parallel
    const [teams, partners, markets, publishers, domainAppIds, appNames, scenarios] = await Promise.all([
      // Teams derived from app_name: WEB (app_name IS NULL) or APP (app_name IS NOT NULL)
      BigQueryService.executeQuery(`
        SELECT DISTINCT
          CASE
            WHEN app_name IS NULL THEN 'WEB'
            ELSE 'APP'
          END as team
        FROM \`gcpp-check.geniee.master_market\`
        ORDER BY team
      `),

      // Partners from master_partner
      BigQueryService.executeQuery(`
        SELECT DISTINCT partner
        FROM \`gcpp-check.geniee.master_partner\`
        WHERE partner IS NOT NULL
        ORDER BY partner
      `),

      // Markets from master_market
      BigQueryService.executeQuery(`
        SELECT DISTINCT market
        FROM \`gcpp-check.geniee.master_market\`
        WHERE market IS NOT NULL
        ORDER BY market
      `),

      // Publishers
      BigQueryService.executeQuery(`
        SELECT DISTINCT publisher
        FROM \`gcpp-check.geniee.master_market\`
        WHERE publisher IS NOT NULL
        ORDER BY publisher
      `),

      // Domain/App IDs from shared_pub_monitoring and new_pub_by_partner
      BigQueryService.executeQuery(`
        SELECT DISTINCT domain_app_id
        FROM (
          SELECT domain_app_id FROM \`gcpp-check.geniee.shared_pub_monitoring\`
          UNION DISTINCT
          SELECT domain_app_id FROM \`gcpp-check.geniee.new_pub_by_partner\`
        )
        WHERE domain_app_id IS NOT NULL
        ORDER BY domain_app_id
        LIMIT 1000
      `),

      // App Names from shared_pub_monitoring and new_pub_by_partner
      BigQueryService.executeQuery(`
        SELECT DISTINCT app_name
        FROM (
          SELECT app_name FROM \`gcpp-check.geniee.shared_pub_monitoring\`
          UNION DISTINCT
          SELECT app_name FROM \`gcpp-check.geniee.new_pub_by_partner\`
        )
        WHERE app_name IS NOT NULL
        ORDER BY app_name
        LIMIT 1000
      `),

      // Scenarios from shared_pub_monitoring (real data from action_guidance column)
      BigQueryService.executeQuery(`
        SELECT DISTINCT scenario
        FROM \`gcpp-check.geniee.shared_pub_monitoring\`
        WHERE scenario IS NOT NULL
        ORDER BY scenario
      `)
    ])

    // Static options for pub categories
    const pubCategories = [
      { label: '<=200K', value: '<=200K' },
      { label: '>200K', value: '>200K' },
      { label: '>5M', value: '>5M' },
      { label: '>10M', value: '>10M' }
    ]

    const performanceLevels = [
      { label: 'Strong increase', value: 'Strong increase' },
      { label: 'Mild increase', value: 'Mild increase' },
      { label: 'Stable', value: 'Stable' },
      { label: 'Mild decrease', value: 'Mild decrease' },
      { label: 'Strong decrease', value: 'Strong decrease' }
    ]

    return NextResponse.json({
      status: 'ok',
      data: {
        teams: teams.map((row: any) => ({ label: row.team, value: row.team })),
        partners: partners.map((row: any) => ({ label: row.partner, value: row.partner })),
        markets: markets.map((row: any) => ({ label: row.market, value: row.market })),
        publishers: publishers.map((row: any) => ({ label: row.publisher, value: row.publisher })),
        domain_app_ids: domainAppIds.map((row: any) => ({ label: row.domain_app_id, value: row.domain_app_id })),
        app_names: appNames.map((row: any) => ({ label: row.app_name, value: row.app_name })),
        pub_size_categories: pubCategories,
        categories: pubCategories,  // Same as pub_size_categories
        scenarios: scenarios.map((row: any) => ({ label: row.scenario, value: row.scenario })),
        performances: performanceLevels
      }
    })
  } catch (error: any) {
    console.error('Error fetching GCPP metadata:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
