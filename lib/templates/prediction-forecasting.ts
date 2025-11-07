import { AnalyticsTemplate, CATEGORIES } from './types'

/**
 * Category 2: Prediction & Forecasting Templates (4 templates)
 * Weekly predictions, team breakdowns, accuracy checks, and monthly trend reports
 */

export const predictionTemplates: AnalyticsTemplate[] = [
  {
    id: 'weekly_prediction_vs_prev',
    title: 'Weekly Revenue Prediction (vs Previous Week)',
    description: 'Compare weekly revenue between consecutive weeks to identify trends',
    category: CATEGORIES.PREDICTION,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: ['revenue', 'profit', 'rpm'],
        defaultValue: 'revenue',
      },
      {
        name: 'weeks_back',
        label: 'Show Last N Weeks',
        type: 'select',
        options: ['4', '8', '12'],
        defaultValue: '8',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const weeksBack = params.weeks_back || '8'
      const metricMap = { revenue: 'rev', profit: 'profit', rpm: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH weekly_data AS (
  SELECT
    DATE_TRUNC(DATE, WEEK) as week,
    SUM(CAST(${metricCol} AS FLOAT64)) as weekly_${metric},
    COUNT(DISTINCT pid) as publishers_active,
    COUNT(*) as records
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${weeksBack} WEEK)
  GROUP BY week
)
SELECT
  week,
  weekly_${metric},
  publishers_active,
  LAG(weekly_${metric}) OVER(ORDER BY week) as prev_week_${metric},
  ROUND((weekly_${metric} - LAG(weekly_${metric}) OVER(ORDER BY week)) / LAG(weekly_${metric}) OVER(ORDER BY week) * 100, 2) as week_over_week_change_pct
FROM weekly_data
ORDER BY week DESC
LIMIT 50
      `.trim()
    },
  },

  {
    id: 'team_prediction_breakdown',
    title: 'Team Performance Breakdown',
    description: 'Compare revenue performance across teams (APP_GV, WEB_GV, WEB_GTI)',
    category: CATEGORIES.PREDICTION,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: ['revenue', 'profit', 'rpm'],
        defaultValue: 'revenue',
      },
      {
        name: 'days_back',
        label: 'Period (Days)',
        type: 'select',
        options: ['7', '14', '30'],
        defaultValue: '30',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const daysBack = params.days_back || '30'
      const metricMap = { revenue: 'rev', profit: 'profit', rpm: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
SELECT
  CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
  DATE_TRUNC(DATE, WEEK) as week,
  SUM(CAST(${metricCol} AS FLOAT64)) as total_${metric},
  COUNT(DISTINCT pid) as num_publishers,
  COUNT(DISTINCT DATE) as days_active
FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
GROUP BY team, week
ORDER BY week DESC, team
LIMIT 100
      `.trim()
    },
  },

  {
    id: 'prediction_accuracy_check',
    title: 'Monthly Trend Analysis',
    description: 'Analyze monthly trends to forecast performance patterns',
    category: CATEGORIES.PREDICTION,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'metric',
        label: 'Metric to Analyze',
        type: 'select',
        options: ['revenue', 'profit', 'impressions'],
        defaultValue: 'revenue',
      },
      {
        name: 'months_back',
        label: 'Show Last N Months',
        type: 'select',
        options: ['3', '6', '12'],
        defaultValue: '6',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const monthsBack = params.months_back || '6'
      const metricMap = { revenue: 'rev', profit: 'profit', impressions: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH monthly_data AS (
  SELECT
    DATE_TRUNC(DATE, MONTH) as month,
    SUM(CAST(${metricCol} AS FLOAT64)) as total_${metric},
    COUNT(DISTINCT DATE) as days_active,
    COUNT(DISTINCT pid) as publishers_active
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${monthsBack} MONTH)
  GROUP BY month
)
SELECT
  month,
  total_${metric},
  days_active,
  publishers_active,
  ROUND(total_${metric} / days_active, 2) as daily_avg_${metric},
  LAG(total_${metric}) OVER(ORDER BY month) as prev_month_${metric},
  ROUND((total_${metric} - LAG(total_${metric}) OVER(ORDER BY month)) / LAG(total_${metric}) OVER(ORDER BY month) * 100, 2) as month_over_month_change_pct
FROM monthly_data
ORDER BY month DESC
LIMIT 50
      `.trim()
    },
  },

  {
    id: 'monthly_trend_report',
    title: 'Month-to-Date Performance Report',
    description: 'Summarize MTD (month-to-date) performance and project end-of-month totals',
    category: CATEGORIES.PREDICTION,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'metric',
        label: 'Metric',
        type: 'select',
        options: ['revenue', 'profit', 'requests'],
        defaultValue: 'revenue',
      },
      {
        name: 'granularity',
        label: 'Group By',
        type: 'select',
        options: ['team', 'product', 'zone'],
        defaultValue: 'team',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const granularity = params.granularity || 'team'
      const metricMap = { revenue: 'rev', profit: 'profit', requests: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      const selectGran =
        granularity === 'product'
          ? 'product'
          : granularity === 'zone'
            ? 'zonename'
            : 'CASE WHEN pic LIKE "APP%" THEN "APP_GV" WHEN pic LIKE "VN%" THEN "WEB_GV" ELSE "WEB_GTI" END'

      return `
WITH mtd_data AS (
  SELECT
    ${selectGran} as dimension,
    SUM(CAST(${metricCol} AS FLOAT64)) as mtd_${metric},
    COUNT(DISTINCT DATE) as days_closed
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY dimension
)
SELECT
  dimension,
  mtd_${metric},
  days_closed,
  EXTRACT(DAY FROM LAST_DAY(CURRENT_DATE())) as days_in_month,
  ROUND(mtd_${metric} / days_closed, 2) as daily_avg_${metric},
  ROUND(mtd_${metric} / days_closed * EXTRACT(DAY FROM LAST_DAY(CURRENT_DATE())), 2) as projected_eom_${metric},
  ROUND(days_closed / EXTRACT(DAY FROM LAST_DAY(CURRENT_DATE())) * 100, 1) as pct_days_complete
FROM mtd_data
ORDER BY mtd_${metric} DESC
LIMIT 100
      `.trim()
    },
  },
]
