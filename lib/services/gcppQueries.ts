/**
 * GCPP Check Query Builder
 * Contains all SQL query builders for GCPP Check feature
 */

export interface GCPPFilters {
  startDate?: string
  endDate?: string
  date?: string  // Single date mode
  team?: string | string[]
  partner?: string | string[]
  market?: string | string[]
  publisher?: string
  pub_size_category?: string | string[]
  scenario?: string | string[]
  performance?: string | string[]
  domain_app_id?: string
  app_name?: string
  category?: string | string[]  // Publisher category (<=200K, >200K, >5M, >10M)
}

/**
 * Helper: Extract value from filter (handles both string and { value: string } formats)
 */
function normalizeFilterValue(value: any): string | string[] {
  if (value === null || value === undefined) return ''

  // If it's an object with a 'value' property (from DateSelector)
  if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
    return value.value
  }

  return value
}

/**
 * Build WHERE clause from filters
 * @param excludeFields - Optional array of field names to exclude from WHERE clause
 */
export function buildGCPPWhereClause(filters: GCPPFilters, tableName?: string, excludeFields?: string[]): string {
  const conditions: string[] = []
  const prefix = tableName ? `${tableName}.` : ''

  // Normalize date values (extract .value if present)
  const date = normalizeFilterValue(filters.date) as string
  const startDate = normalizeFilterValue(filters.startDate) as string
  const endDate = normalizeFilterValue(filters.endDate) as string

  // Date handling - single date or date range
  if (date) {
    // Single date mode
    conditions.push(`${prefix}date = '${date}'`)
  } else if (startDate && endDate) {
    // Date range mode
    conditions.push(`${prefix}date BETWEEN '${startDate}' AND '${endDate}'`)
  }

  // Team filter - translate to app_name conditions
  // team='WEB' means app_name IS NULL
  // team='APP' means app_name IS NOT NULL
  if (filters.team) {
    const teams = Array.isArray(filters.team) ? filters.team : [filters.team]
    const teamConditions: string[] = []

    teams.forEach(team => {
      if (team === 'WEB') {
        teamConditions.push(`${prefix}app_name IS NULL`)
      } else if (team === 'APP') {
        teamConditions.push(`${prefix}app_name IS NOT NULL`)
      }
    })

    if (teamConditions.length > 0) {
      // If multiple teams selected, use OR
      if (teamConditions.length > 1) {
        conditions.push(`(${teamConditions.join(' OR ')})`)
      } else {
        conditions.push(teamConditions[0])
      }
    }
  }

  // Partner filter
  if (filters.partner) {
    const partners = Array.isArray(filters.partner) ? filters.partner : [filters.partner]
    console.log('[DEBUG] Partner filter received:', filters.partner)
    console.log('[DEBUG] Partner filter (array):', partners)
    // Use UPPER() in SQL for case-insensitive comparison instead of transforming the value
    const escapedPartners = partners.map(p => `'${p.replace(/'/g, "\\'")}'`)
    console.log('[DEBUG] Partner filter (escaped):', escapedPartners)
    // Use case-insensitive comparison with UPPER()
    if (escapedPartners.length === 1) {
      conditions.push(`UPPER(${prefix}partner) = UPPER(${escapedPartners[0]})`)
    } else {
      // For IN clause with multiple values, use UPPER on both sides
      const upperValues = partners.map(p => `'${p.toUpperCase().replace(/'/g, "\\'")}'`)
      console.log('[DEBUG] Partner filter (uppercase for IN):', upperValues)
      conditions.push(`UPPER(${prefix}partner) IN (${upperValues.join(',')})`)
    }
  }

  // Market filter
  if (filters.market && !excludeFields?.includes('market')) {
    const markets = Array.isArray(filters.market) ? filters.market : [filters.market]
    const escapedMarkets = markets.map(m => `'${m.replace(/'/g, "\\'")}'`)
    conditions.push(`${prefix}market IN (${escapedMarkets.join(',')})`)
  }

  // Publisher filter (LIKE search)
  if (filters.publisher) {
    const escapedPublisher = filters.publisher.replace(/'/g, "\\'")
    conditions.push(`${prefix}publisher LIKE '%${escapedPublisher}%'`)
  }

  // Domain/App ID filter
  if (filters.domain_app_id) {
    const domainAppIds = Array.isArray(filters.domain_app_id) ? filters.domain_app_id : [filters.domain_app_id]
    const escapedDomainAppIds = domainAppIds.map(d => `'${d.replace(/'/g, "\\'")}'`)
    conditions.push(`${prefix}domain_app_id IN (${escapedDomainAppIds.join(',')})`)
  }

  // App name filter
  if (filters.app_name) {
    const appNames = Array.isArray(filters.app_name) ? filters.app_name : [filters.app_name]
    const escapedAppNames = appNames.map(a => `'${a.replace(/'/g, "\\'")}'`)
    conditions.push(`${prefix}app_name IN (${escapedAppNames.join(',')})`)
  }

  // Scenario filter (for shared_pub_monitoring)
  if (filters.scenario) {
    const scenarios = Array.isArray(filters.scenario) ? filters.scenario : [filters.scenario]
    const escapedScenarios = scenarios.map(s => `'${s.replace(/'/g, "\\'")}'`)
    conditions.push(`${prefix}scenario IN (${escapedScenarios.join(',')})`)
  }

  // Performance filter (for master_partner_market_top_by_market)
  if (filters.performance) {
    const performances = Array.isArray(filters.performance) ? filters.performance : [filters.performance]
    const escapedPerformances = performances.map(p => `'${p.replace(/'/g, "\\'")}'`)
    conditions.push(`${prefix}performance IN (${escapedPerformances.join(',')})`)
  }

  // Pub size category filter (for new_pub_by_partner, shared_pub_monitoring)
  if (filters.pub_size_category) {
    const categories = Array.isArray(filters.pub_size_category) ? filters.pub_size_category : [filters.pub_size_category]
    console.log('[DEBUG] pub_size_category filter received:', filters.pub_size_category)
    console.log('[DEBUG] pub_size_category filter (array):', categories)
    const escapedCategories = categories.map(c => `'${c.replace(/'/g, "\\'")}'`)
    console.log('[DEBUG] pub_size_category filter (SQL):', escapedCategories)
    conditions.push(`${prefix}pub_size_category IN (${escapedCategories.join(',')})`)
  }

  // Note: 'category' filter is NOT added here because it's a computed field in CTEs.
  // It must be filtered in the outer query after computation (see getMarketBreakdownQueries)

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
}

/**
 * Categorize publisher by impression count
 */
export function categorizePublisher(impressions: number): string {
  if (impressions > 10000000) return '>10M'
  if (impressions > 5000000) return '>5M'
  if (impressions > 200000) return '>200K'
  return '<=200K'
}

/**
 * Calculate performance trend
 */
export function calculatePerformance(current: number, previous: number): string {
  if (!previous || previous === 0) return 'New'

  const change = ((current - previous) / previous) * 100

  if (change > 50) return 'Strong increase'
  if (change > 10) return 'Mild increase'
  if (change < -50) return 'Strong decrease'
  if (change < -10) return 'Mild decrease'
  return 'Stable'
}

/**
 * Market Overview Queries (Tab 1)
 * Tables: market_share_all_partner, partner_market_distribution
 */
export function getMarketOverviewQueries(whereClause: string) {
  // Check if WHERE clause has team filter (app_name conditions)
  const hasTeamFilter = whereClause.includes('app_name')

  // For non-team filters, apply them directly to market_share_all_partner
  // For team filter, we need to JOIN with master_market
  let marketShareWhereClause = whereClause
    .replace(/\bdate\b/g, 'msp.date')
    .replace(/\bpartner\b/g, 'msp.partner')
    .replace(/\bmarket\b/g, 'msp.market')

  // If there's a team filter, we need to add JOIN conditions
  let joinClause = ''
  if (hasTeamFilter) {
    joinClause = `
      LEFT JOIN \`gcpp-check.geniee.master_market\` mm
        ON msp.date = mm.date
        AND msp.market = mm.market`
    // ✅ FIX: Removed 'AND msp.partner = mm.partner' because master_market doesn't have partner column

    // Replace app_name references with mm.app_name
    marketShareWhereClause = marketShareWhereClause.replace(/\bapp_name\b/g, 'mm.app_name')
  }

  console.log('[getMarketOverviewQueries] Original WHERE:', whereClause)
  console.log('[getMarketOverviewQueries] Has team filter:', hasTeamFilter)
  console.log('[getMarketOverviewQueries] Final WHERE:', marketShareWhereClause)

  return {
    // Market share by market and partner (for stacked bar chart)
    marketShareByMarketPartner: `
      SELECT
        msp.market,
        msp.partner,
        SUM(msp.partner_impressions) as impressions,
        AVG(msp.market_share_percent) as market_share_percent
      FROM \`gcpp-check.geniee.market_share_all_partner\` msp${joinClause}
      ${marketShareWhereClause}
      GROUP BY msp.market, msp.partner
      ORDER BY msp.market, impressions DESC
    `,

    // Market share detail (table)
    marketShareDetail: `
      SELECT
        msp.partner,
        msp.market,
        AVG(msp.market_share_percent) as market_share_percent,
        SUM(msp.partner_impressions) as total_impressions
      FROM \`gcpp-check.geniee.market_share_all_partner\` msp${joinClause}
      ${marketShareWhereClause}
      GROUP BY msp.partner, msp.market
      ORDER BY market_share_percent DESC
      LIMIT 100
    `,

    // Impressions time series by partner
    impressionsTimeSeries: `
      SELECT
        msp.date,
        msp.partner,
        SUM(msp.partner_impressions) as impressions
      FROM \`gcpp-check.geniee.market_share_all_partner\` msp${joinClause}
      ${marketShareWhereClause}
      GROUP BY msp.date, msp.partner
      ORDER BY msp.date ASC, msp.partner
    `,

    // Market distribution for selected partner (for pie chart)
    // Returns data for all partners so frontend can filter by selected partner
    marketDistribution: `
      WITH partner_totals AS (
        SELECT
          pmd.partner,
          pmd.market,
          SUM(pmd.market_impressions) as market_impressions
        FROM \`gcpp-check.geniee.partner_market_distribution\` pmd${hasTeamFilter ? `
        LEFT JOIN \`gcpp-check.geniee.master_market\` mm
          ON pmd.date = mm.date
          AND pmd.market = mm.market` : ''}
        ${marketShareWhereClause.replace(/msp\./g, 'pmd.')}
        GROUP BY pmd.partner, pmd.market
      )
      SELECT
        partner,
        market,
        market_impressions as impressions,
        ROUND(market_impressions * 100.0 / SUM(market_impressions) OVER (PARTITION BY partner), 2) as percent_of_total
      FROM partner_totals
      ORDER BY partner, impressions DESC
    `
  }
}

/**
 * Market Breakdown Queries (Tab 2)
 * Tables: master_partner_market_top_by_market, master_partner_market, master_partner_in_top_100
 */
export function getMarketBreakdownQueries(whereClause: string, filters?: GCPPFilters) {
  // Build category filter for the outer query (after CTE computation)
  const categoryFilter = filters?.category
    ? (() => {
        const categories = Array.isArray(filters.category) ? filters.category : [filters.category]
        const escapedCategories = categories.map(c => `'${c.replace(/'/g, "\\'")}'`)
        return `WHERE category IN (${escapedCategories.join(',')})`
      })()
    : ''

  return {
    // Top 100 by market
    top100ByMarket: `
      SELECT
        date,
        market,
        domain_app_id,
        app_name,
        filtered_impressions,
        partner,
        publisher as all_partners,
        CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
        CASE
          WHEN filtered_impressions > 10000000 THEN '>10M'
          WHEN filtered_impressions > 5000000 THEN '>5M'
          WHEN filtered_impressions > 200000 THEN '>200K'
          ELSE '<=200K'
        END as category
      FROM \`gcpp-check.geniee.master_partner_in_top_100\`
      ${whereClause}
      ${categoryFilter}
      ORDER BY filtered_impressions DESC
    `,

    // Pub count by partner and market (with categorization)
    pubCountByPartnerMarket: `
      WITH categorized AS (
        SELECT
          partner,
          market,
          domain_app_id,
          CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
          SUM(filtered_impressions) as total_impressions,
          CASE
            WHEN SUM(filtered_impressions) > 10000000 THEN '>10M'
            WHEN SUM(filtered_impressions) > 5000000 THEN '>5M'
            WHEN SUM(filtered_impressions) > 200000 THEN '>200K'
            ELSE '<=200K'
          END as category
        FROM \`gcpp-check.geniee.master_partner_market\`
        ${whereClause}
        GROUP BY partner, market, domain_app_id, team
      )
      SELECT
        partner,
        market,
        team,
        category,
        COUNT(DISTINCT domain_app_id) as pub_count
      FROM categorized
      ${categoryFilter}
      GROUP BY partner, market, team, category
      ORDER BY partner, market, category
    `,

    // Pub count breakdown detail
    pubCountBreakdown: `
      WITH categorized AS (
        SELECT
          partner,
          market,
          domain_app_id,
          app_name,
          CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
          SUM(filtered_impressions) as total_impressions,
          CASE
            WHEN SUM(filtered_impressions) > 10000000 THEN '>10M'
            WHEN SUM(filtered_impressions) > 5000000 THEN '>5M'
            WHEN SUM(filtered_impressions) > 200000 THEN '>200K'
            ELSE '<=200K'
          END as category
        FROM \`gcpp-check.geniee.master_partner_market\`
        ${whereClause}
        GROUP BY partner, market, domain_app_id, app_name, team
      )
      SELECT *
      FROM categorized
      ${categoryFilter}
      ORDER BY total_impressions DESC
    `
  }
}

/**
 * Partner Breakdown Queries (Tab 3)
 * Tables: master_partner
 */
export function getPartnerBreakdownQueries(whereClause: string, filters?: GCPPFilters) {
  // Build category filter for the outer query (after CTE computation)
  const categoryFilter = filters?.category
    ? (() => {
        const categories = Array.isArray(filters.category) ? filters.category : [filters.category]
        const escapedCategories = categories.map(c => `'${c.replace(/'/g, "\\'")}'`)
        console.log('[DEBUG] Partner Breakdown category filter:', escapedCategories)
        return `WHERE category IN (${escapedCategories.join(',')})`
      })()
    : ''

  return {
    // Total pub count by partner over time
    pubCountTimeSeries: `
      WITH categorized AS (
        SELECT
          date,
          partner,
          domain_app_id,
          CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
          SUM(filtered_impressions) as total_impressions,
          CASE
            WHEN SUM(filtered_impressions) > 10000000 THEN '>10M'
            WHEN SUM(filtered_impressions) > 5000000 THEN '>5M'
            WHEN SUM(filtered_impressions) > 200000 THEN '>200K'
            ELSE '<=200K'
          END as category
        FROM \`gcpp-check.geniee.master_partner\`
        ${whereClause}
        GROUP BY date, partner, domain_app_id, team
      )
      SELECT
        date,
        partner,
        team,
        category,
        COUNT(DISTINCT domain_app_id) as pub_count
      FROM categorized
      GROUP BY date, partner, team, category
      ORDER BY date ASC, partner, category
    `,

    // Publisher category distribution
    categoryDistribution: `
      WITH categorized AS (
        SELECT
          partner,
          domain_app_id,
          CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
          SUM(filtered_impressions) as total_impressions,
          CASE
            WHEN SUM(filtered_impressions) > 10000000 THEN '>10M'
            WHEN SUM(filtered_impressions) > 5000000 THEN '>5M'
            WHEN SUM(filtered_impressions) > 200000 THEN '>200K'
            ELSE '<=200K'
          END as category
        FROM \`gcpp-check.geniee.master_partner\`
        ${whereClause}
        GROUP BY partner, domain_app_id, team
      )
      SELECT
        partner,
        team,
        category,
        COUNT(DISTINCT domain_app_id) as pub_count
      FROM categorized
      ${categoryFilter}
      GROUP BY partner, team, category
      ORDER BY category DESC, partner
    `,

    // Pub count > 200K breakdown
    pubCountOver200K: `
      WITH categorized AS (
        SELECT
          date,
          partner,
          domain_app_id,
          CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
          SUM(filtered_impressions) as total_impressions,
          CASE
            WHEN SUM(filtered_impressions) > 10000000 THEN '>10M'
            WHEN SUM(filtered_impressions) > 5000000 THEN '>5M'
            WHEN SUM(filtered_impressions) > 200000 THEN '>200K'
            ELSE '<=200K'
          END as category
        FROM \`gcpp-check.geniee.master_partner\`
        ${whereClause}
        GROUP BY date, partner, domain_app_id, team
      )
      SELECT
        date,
        partner,
        team,
        category,
        COUNT(DISTINCT domain_app_id) as pub_count
      FROM categorized
      ${categoryFilter || "WHERE category IN ('>200K', '>5M', '>10M')"}
      GROUP BY date, partner, team, category
      ORDER BY date DESC, partner, category
    `,

    // Pub count detail
    pubCountDetail: `
      WITH categorized AS (
        SELECT
          date,
          partner,
          domain_app_id,
          app_name,
          CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
          SUM(filtered_impressions) as total_impressions,
          CASE
            WHEN SUM(filtered_impressions) > 10000000 THEN '>10M'
            WHEN SUM(filtered_impressions) > 5000000 THEN '>5M'
            WHEN SUM(filtered_impressions) > 200000 THEN '>200K'
            ELSE '<=200K'
          END as category
        FROM \`gcpp-check.geniee.master_partner\`
        ${whereClause}
        GROUP BY date, partner, domain_app_id, app_name, team
      )
      SELECT *
      FROM categorized
      ${categoryFilter}
      ORDER BY total_impressions DESC
      LIMIT 500
    `
  }
}

/**
 * Partner Breakdown Part 2 Queries (Tab 4)
 * Tables: master_top_100_by_partner_all_market, master_partner_market_top_by_market, geniee_wallet_analysis
 *
 * NOTE: Only master_partner_market_top_by_market has 'market' column.
 * Other tables aggregate across all markets, so we exclude 'market' filter from their WHERE clauses.
 */
export function getPartnerBreakdown2Queries(filters: GCPPFilters) {
  // For top100ByPartner: exclude 'market' (table doesn't have it - aggregates all markets)
  const top100WhereClause = buildGCPPWhereClause(filters, undefined, ['market'])

  // For topPubsByPartnerMarket: include all filters (has market column)
  const topPubsWhereClause = buildGCPPWhereClause(filters)

  // For genieeWallet: exclude 'market' (table doesn't have it - aggregates all markets)
  const walletWhereClause = buildGCPPWhereClause(filters, undefined, ['market'])

  return {
    // Top 100 by partner (all markets)
    top100ByPartner: `
      SELECT
        rank,
        partner,
        domain_app_id,
        app_name,
        CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
        filtered_impressions,
        date
      FROM \`gcpp-check.geniee.master_top_100_by_partner_all_market\`
      ${top100WhereClause}
      ORDER BY rank ASC
    `,

    // Top pubs by partner and market with performance
    topPubsByPartnerMarket: `
      SELECT
        domain_app_id,
        app_name,
        prev_impressions,
        performance,
        market,
        filtered_impressions,
        partner,
        CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
        date
      FROM \`gcpp-check.geniee.master_partner_market_top_by_market\`
      ${topPubsWhereClause}
      ORDER BY filtered_impressions DESC
    `,

    // Geniee wallet analysis
    genieeWallet: `
      SELECT
        date,
        domain_app_id,
        app_name,
        CASE WHEN app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
        geniee_impressions,
        total_impressions,
        impressions_percentage
      FROM \`gcpp-check.geniee.geniee_wallet_analysis\`
      ${walletWhereClause}
      ORDER BY impressions_percentage DESC
    `
  }
}

/**
 * Publisher Monitoring Queries (Tab 5)
 * Tables: new_pub_by_partner, shared_pub_monitoring
 *
 * SCHEMA NOTES (verified from BigQuery):
 * - new_pub_by_partner: NO date column (snapshot table), HAS pub_size_category
 * - shared_pub_monitoring: NO date column, uses latest_date/previous_date instead, NO pub_size_category
 */
export function getPublisherMonitoringQueries(filters: GCPPFilters) {
  // For new_pub_by_partner: Exclude date filters (table has no date column)
  const newPubFilters = { ...filters }
  delete newPubFilters.date
  delete newPubFilters.startDate
  delete newPubFilters.endDate
  const newPubWhereClause = buildGCPPWhereClause(newPubFilters)

  // For shared_pub_monitoring: Exclude pub_size_category and replace 'date' with 'latest_date'
  const sharedPubFilters = { ...filters }
  delete sharedPubFilters.pub_size_category

  // Build WHERE clause and replace 'date' with 'latest_date'
  let sharedPubWhereClause = buildGCPPWhereClause(sharedPubFilters)
  sharedPubWhereClause = sharedPubWhereClause.replace(/\bdate\b/g, 'latest_date')

  return {
    // New publishers by partner (NO date filter - snapshot table)
    newPubsByPartner: `
      SELECT
        partner,
        domain_app_id,
        app_name,
        pub_size_category,
        filtered_impressions,
        team
      FROM \`gcpp-check.geniee.new_pub_by_partner\`
      ${newPubWhereClause}
      ORDER BY filtered_impressions DESC
      LIMIT 500
    `,

    // Shared pubs monitoring (uses latest_date, no pub_size_category)
    sharedPubsMonitoring: `
      SELECT
        domain_app_id,
        app_name,
        latest_date,
        competitor_partner,
        scenario,
        action_guidance,
        geniee_growth_pct,
        competitor_growth_pct,
        team
      FROM \`gcpp-check.geniee.shared_pub_monitoring\`
      ${sharedPubWhereClause}
      ORDER BY ABS(geniee_growth_pct - competitor_growth_pct) DESC
      LIMIT 500
    `,

    // Shared pubs monitoring details (uses latest_date, no pub_size_category)
    sharedPubsDetails: `
      SELECT
        domain_app_id,
        app_name,
        latest_date,
        geniee_impressions_latest,
        geniee_impressions_previous,
        competitor_impressions_latest,
        competitor_impressions_previous,
        competitor_partner,
        geniee_growth_pct,
        competitor_growth_pct,
        scenario,
        team
      FROM \`gcpp-check.geniee.shared_pub_monitoring\`
      ${sharedPubWhereClause}
      ORDER BY latest_date DESC
      LIMIT 500
    `
  }
}

/**
 * Churned Publishers by Partner Query
 * Compares 3 most recent weekly dates to find publishers that had impressions
 * in the last week (week 2) but are missing from current week (week 1)
 *
 * SCHEMA NOTES:
 * - Uses master_partner table with date, partner, domain_app_id, filtered_impressions
 * - Compares Week 1 (current), Week 2 (last week), Week 3 (2 weeks ago)
 */
export function getChurnedPublishersByPartnerQuery(filters: GCPPFilters) {
  // Build filter conditions excluding date (we handle dates separately)
  const filterOnlyFilters = { ...filters }
  delete filterOnlyFilters.date
  delete filterOnlyFilters.startDate
  delete filterOnlyFilters.endDate

  // Build WHERE clause and extract conditions only (remove 'WHERE' keyword)
  const whereClause = buildGCPPWhereClause(filterOnlyFilters)
  const conditions = whereClause.replace(/^WHERE\s+/, '')

  return `
    WITH recent_dates AS (
      -- Get 3 most recent weekly snapshot dates
      SELECT DISTINCT date
      FROM \`gcpp-check.geniee.master_partner\`
      ORDER BY date DESC
      LIMIT 3
    ),
    dates_numbered AS (
      -- Assign week numbers: 1 = current week, 2 = last week, 3 = 2 weeks ago
      SELECT
        date,
        ROW_NUMBER() OVER (ORDER BY date DESC) as week_num
      FROM recent_dates
    ),
    week_1_current AS (
      -- Publishers in current week (Week 1)
      SELECT DISTINCT partner, domain_app_id
      FROM \`gcpp-check.geniee.master_partner\` mp
      WHERE date = (SELECT date FROM dates_numbered WHERE week_num = 1)
      ${conditions ? 'AND ' + conditions : ''}
    ),
    week_2_last AS (
      -- Publishers in last week (Week 2) with their impressions
      SELECT
        partner,
        domain_app_id,
        app_name,
        SUM(filtered_impressions) as impressions,
        MAX(date) as week_date
      FROM \`gcpp-check.geniee.master_partner\` mp
      WHERE date = (SELECT date FROM dates_numbered WHERE week_num = 2)
      ${conditions ? 'AND ' + conditions : ''}
      GROUP BY partner, domain_app_id, app_name
    ),
    week_3_prev AS (
      -- Publishers 2 weeks ago (Week 3) with their impressions
      SELECT
        partner,
        domain_app_id,
        app_name,
        SUM(filtered_impressions) as impressions,
        MAX(date) as week_date
      FROM \`gcpp-check.geniee.master_partner\` mp
      WHERE date = (SELECT date FROM dates_numbered WHERE week_num = 3)
      ${conditions ? 'AND ' + conditions : ''}
      GROUP BY partner, domain_app_id, app_name
    ),
    all_previous AS (
      -- Union of all publishers from Week 2 or Week 3
      SELECT partner, domain_app_id, app_name FROM week_2_last
      UNION DISTINCT
      SELECT partner, domain_app_id, app_name FROM week_3_prev
    )
    SELECT
      ap.partner,
      ap.domain_app_id,
      ap.app_name,
      CASE WHEN ap.app_name IS NULL THEN 'WEB' ELSE 'APP' END as team,
      CAST(w2.week_date AS STRING) as last_week_date,
      COALESCE(w2.impressions, 0) as last_week_impressions,
      CAST(w3.week_date AS STRING) as previous_week_date,
      COALESCE(w3.impressions, 0) as previous_week_impressions,
      (COALESCE(w2.impressions, 0) + COALESCE(w3.impressions, 0)) as total_impressions
    FROM all_previous ap
    LEFT JOIN week_2_last w2
      ON ap.partner = w2.partner
      AND ap.domain_app_id = w2.domain_app_id
    LEFT JOIN week_3_prev w3
      ON ap.partner = w3.partner
      AND ap.domain_app_id = w3.domain_app_id
    LEFT JOIN week_1_current w1
      ON ap.partner = w1.partner
      AND ap.domain_app_id = w1.domain_app_id
    WHERE w1.domain_app_id IS NULL  -- Missing in current week = CHURNED
    ORDER BY (COALESCE(w2.impressions, 0) + COALESCE(w3.impressions, 0)) DESC  -- Sort by total impressions from both weeks
    LIMIT 500
  `
}
