import { AnalyticsTemplate, CATEGORIES } from './types'

/**
 * Category 1: Performance Analysis Templates (5 templates)
 * Analyze team daily performance, top movers, publisher deep dives, zone performance, and yearly growth
 */

export const performanceTemplates: AnalyticsTemplate[] = [
  {
    id: 'team_daily_vs_30d',
    title: 'Team Daily vs 30-Day Average',
    description: 'Compare a team\'s performance yesterday vs their 30-day average; identify drops by publisher, product, or zone',
    category: CATEGORIES.PERFORMANCE,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'team',
        label: 'Team',
        type: 'select',
        options: ['APP_GV', 'WEB_GV', 'WEB_GTI', 'All Teams'],
        defaultValue: 'All Teams',
      },
      {
        name: 'metric',
        label: 'Primary Metric',
        type: 'select',
        options: ['revenue', 'profit', 'rpm', 'impressions', 'requests'],
        defaultValue: 'revenue',
      },
      {
        name: 'drill_down',
        label: 'Drill Down By',
        type: 'select',
        options: ['publisher', 'product', 'zone', 'none'],
        defaultValue: 'publisher',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const metricMap = { revenue: 'rev', profit: 'profit', rpm: 'req', impressions: 'req', requests: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH yesterday_data AS (
  SELECT 1 as grp, SUM(CAST(${metricCol} AS FLOAT64)) as yesterday_${metric}
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` p
  WHERE DATE = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  GROUP BY 1
),
daily_totals AS (
  SELECT
    DATE,
    SUM(CAST(${metricCol} AS FLOAT64)) as daily_${metric}
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` p
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND DATE < CURRENT_DATE()
  GROUP BY DATE
),
avg_30d AS (
  SELECT 1 as grp, AVG(daily_${metric}) as avg_30d_${metric}
  FROM daily_totals
)
SELECT y.yesterday_${metric}, a.avg_30d_${metric}, ROUND((y.yesterday_${metric} - a.avg_30d_${metric}) / NULLIF(a.avg_30d_${metric}, 0) * 100, 2) as variance_pct
FROM yesterday_data y
LEFT JOIN avg_30d a ON y.grp = a.grp
ORDER BY variance_pct
LIMIT 100
      `.trim()
    },
  },

  {
    id: 'top_movers_daily',
    title: 'Top Movers (Daily Changes)',
    description: 'Identify publishers with biggest day-over-day revenue or eCPM changes',
    category: CATEGORIES.PERFORMANCE,
    sourceTable: 'CS_Top_movers_daily',
    fields: [
      {
        name: 'metric',
        label: 'Metric to Track',
        type: 'select',
        options: ['revenue', 'ecpm', 'rpm', 'impressions'],
        defaultValue: 'revenue',
      },
      {
        name: 'direction',
        label: 'Show',
        type: 'select',
        options: ['Top Gainers', 'Top Losers', 'Both'],
        defaultValue: 'Both',
      },
      {
        name: 'limit',
        label: 'Top N Results',
        type: 'number',
        defaultValue: '20',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const limit = params.limit || '20'

      return `
SELECT
  pid,
  pubname,
  team,
  product,
  yesterday_${metric},
  today_${metric},
  ROUND((today_${metric} - yesterday_${metric}) / yesterday_${metric} * 100, 2) as pct_change,
  ROUND(today_${metric} - yesterday_${metric}, 2) as absolute_change
FROM \`gcpp-check.CS_Top_movers_daily\`
WHERE TODAY() = CURRENT_DATE()
ORDER BY ABS(pct_change) DESC
LIMIT ${limit}
      `.trim()
    },
  },

  {
    id: 'pid_deep_dive',
    title: 'PID Deep Dive (Performance Root Cause)',
    description: 'Diagnose why a specific publisher\'s revenue or profit changed (by zone, format, or driver)',
    category: CATEGORIES.PERFORMANCE,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'pid',
        label: 'Publisher ID',
        type: 'text',
        placeholder: 'Enter PID',
        required: true,
      },
      {
        name: 'metric',
        label: 'Metric to Analyze',
        type: 'select',
        options: ['revenue', 'profit', 'rpm', 'impressions'],
        defaultValue: 'revenue',
      },
      {
        name: 'period',
        label: 'Compare Period',
        type: 'select',
        options: ['vs yesterday', 'vs 7d ago', 'vs 30d avg'],
        defaultValue: 'vs yesterday',
      },
    ],
    buildQuery: (params) => {
      const pid = params.pid
      const metric = params.metric || 'revenue'
      const period =
        params.period === 'vs 7d ago'
          ? '7'
          : params.period === 'vs 30d avg'
            ? 'month'
            : '1'

      const periodWhere =
        period === 'month'
          ? `WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`
          : `WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${period} DAY)`

      const metricMap = { revenue: 'rev', profit: 'profit', rpm: 'req', impressions: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH breakdown AS (
  SELECT
    product,
    zonename,
    SUM(CAST(${metricCol} AS FLOAT64)) as ${metric},
    COUNT(*) as records
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE pid = '${pid}'
  ${periodWhere}
  GROUP BY product, zonename
)
SELECT
  product,
  zonename,
  ${metric},
  records,
  ROUND(${metric} / SUM(${metric}) OVER() * 100, 2) as pct_of_total
FROM breakdown
ORDER BY ${metric} DESC
LIMIT 50
      `.trim()
    },
  },

  {
    id: 'zone_performance_change',
    title: 'Zone-Level Performance Change',
    description: 'Analyze performance at zone level over a period (detect underperforming zones)',
    category: CATEGORIES.PERFORMANCE,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'days_back',
        label: 'Period (Days)',
        type: 'select',
        options: ['7', '14', '30', '60', '90'],
        defaultValue: '30',
      },
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: ['revenue', 'profit', 'impressions', 'requests'],
        defaultValue: 'revenue',
      },
      {
        name: 'min_threshold',
        label: 'Min Variance % to Show',
        type: 'number',
        defaultValue: '5',
      },
    ],
    buildQuery: (params) => {
      const daysBack = params.days_back || '30'
      const metric = params.metric || 'revenue'
      const threshold = params.min_threshold || '5'
      const metricMap = { revenue: 'rev', profit: 'profit', impressions: 'req', requests: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH period_data AS (
  SELECT
    zid,
    zonename,
    SUM(CAST(${metricCol} AS FLOAT64)) as total_${metric},
    COUNT(DISTINCT DATE) as days_active
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
  GROUP BY zid, zonename
)
SELECT
  zonename,
  total_${metric},
  days_active,
  ROUND(total_${metric} / days_active, 2) as daily_avg_${metric},
  RANK() OVER(ORDER BY total_${metric} DESC) as ranking
FROM period_data
WHERE ABS(total_${metric}) > ${threshold}
ORDER BY total_${metric} DESC
LIMIT 100
      `.trim()
    },
  },

  {
    id: 'yearly_growth_by_metric',
    title: 'Year-over-Year Growth by Metric',
    description: 'Show long-term growth trends by ad format, request volume, or eCPM',
    category: CATEGORIES.PERFORMANCE,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'metric',
        label: 'Metric to Track',
        type: 'select',
        options: ['revenue', 'profit', 'impressions', 'requests', 'rpm'],
        defaultValue: 'revenue',
      },
      {
        name: 'group_by',
        label: 'Group By',
        type: 'select',
        options: ['product', 'zone', 'team', 'month'],
        defaultValue: 'product',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const groupBy = params.group_by || 'product'
      const metricMap = { revenue: 'rev', profit: 'profit', impressions: 'req', requests: 'req', rpm: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      const selectGroup =
        groupBy === 'product'
          ? 'product'
          : groupBy === 'zone'
            ? 'zonename'
            : groupBy === 'team'
              ? 'CASE WHEN pic LIKE "APP%" THEN "APP_GV" WHEN pic LIKE "VN%" THEN "WEB_GV" ELSE "WEB_GTI" END'
              : 'FORMAT_DATE("%Y-%m", DATE)'

      return `
WITH yearly_data AS (
  SELECT
    EXTRACT(YEAR FROM DATE) as year,
    ${selectGroup} as dimension,
    SUM(CAST(${metricCol} AS FLOAT64)) as total_${metric}
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR)
  GROUP BY year, dimension
)
SELECT
  dimension,
  year,
  total_${metric},
  LAG(total_${metric}) OVER(PARTITION BY dimension ORDER BY year) as prev_year_${metric},
  ROUND((total_${metric} - LAG(total_${metric}) OVER(PARTITION BY dimension ORDER BY year)) / LAG(total_${metric}) OVER(PARTITION BY dimension ORDER BY year) * 100, 2) as yoy_growth_pct
FROM yearly_data
ORDER BY dimension, year DESC
LIMIT 100
      `.trim()
    },
  },
]
