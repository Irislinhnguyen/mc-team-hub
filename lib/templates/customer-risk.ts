import { AnalyticsTemplate, CATEGORIES } from './types'

/**
 * Category 4: Customer / Risk Insights Templates (4 templates)
 * Top publishers, churn risk, new publisher tracking, and customer summary
 */

export const customerRiskTemplates: AnalyticsTemplate[] = [
  {
    id: 'top_publishers_by_metric',
    title: 'Top Publishers by Metric',
    description: 'Rank top publishers by revenue, profit, or ad requests',
    category: CATEGORIES.CUSTOMER,
    sourceTable: 'CS_Customer_summary_dashboard',
    fields: [
      {
        name: 'metric',
        label: 'Ranking Metric',
        type: 'select',
        options: ['revenue', 'profit', 'impressions', 'requests'],
        defaultValue: 'revenue',
      },
      {
        name: 'limit',
        label: 'Top N Publishers',
        type: 'select',
        options: ['10', '25', '50', '100'],
        defaultValue: '50',
      },
      {
        name: 'period',
        label: 'Time Period',
        type: 'select',
        options: ['this month', 'last month', 'last 90 days'],
        defaultValue: 'this month',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const limit = params.limit || '50'
      const periodDays =
        params.period === 'last month'
          ? '60'
          : params.period === 'last 90 days'
            ? '90'
            : '30'
      const metricMap = { revenue: 'rev', profit: 'profit', impressions: 'req', requests: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
SELECT
  pid,
  pubname,
  CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
  SUM(CAST(${metricCol} AS FLOAT64)) as total_${metric},
  COUNT(DISTINCT DATE) as active_days,
  COUNT(DISTINCT product) as formats_used,
  COUNT(DISTINCT zid) as zones_active,
  ROUND(SUM(CAST(${metricCol} AS FLOAT64)) / COUNT(DISTINCT DATE), 2) as daily_avg_${metric}
FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${periodDays} DAY)
GROUP BY pid, pubname, team
ORDER BY total_${metric} DESC
LIMIT ${limit}
      `.trim()
    },
  },

  {
    id: 'churn_risk_detector',
    title: 'Churn Risk Detector',
    description: 'Identify high-risk or inactive publishers (projected revenue = 0)',
    category: CATEGORIES.CUSTOMER,
    sourceTable: 'CS_Customer_summary_dashboard',
    fields: [
      {
        name: 'risk_threshold',
        label: 'Risk Threshold (%)',
        type: 'select',
        options: ['25', '50', '75'],
        defaultValue: '50',
      },
      {
        name: 'min_historical_revenue',
        label: 'Min Historical Revenue ($)',
        type: 'number',
        defaultValue: '5000',
      },
    ],
    buildQuery: (params) => {
      const threshold = (100 - parseInt(params.risk_threshold || '50')) / 100
      const minRevenue = params.min_historical_revenue || '5000'

      return `
WITH publisher_history AS (
  SELECT
    pid,
    pubname,
    CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
    SUM(CAST(rev AS FLOAT64)) as total_historical_revenue,
    MAX(DATE) as last_active_date,
    COUNT(DISTINCT DATE) as active_days_total
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  GROUP BY pid, pubname, team
  HAVING SUM(CAST(rev AS FLOAT64)) > ${minRevenue}
),
recent_activity AS (
  SELECT
    pid,
    SUM(CAST(rev AS FLOAT64)) as recent_30d_revenue,
    COUNT(DISTINCT DATE) as active_days_30d
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY pid
)
SELECT
  h.pid,
  h.pubname,
  h.team,
  h.total_historical_revenue,
  COALESCE(r.recent_30d_revenue, 0) as recent_30d_revenue,
  ROUND(COALESCE(r.recent_30d_revenue, 0) / (h.total_historical_revenue / 12), 2) as monthly_decline_pct,
  h.last_active_date,
  DATE_DIFF(CURRENT_DATE(), h.last_active_date, DAY) as days_since_active,
  CASE
    WHEN COALESCE(r.recent_30d_revenue, 0) = 0 THEN '🔴 Inactive'
    WHEN COALESCE(r.recent_30d_revenue, 0) / (h.total_historical_revenue / 12) < ${threshold} THEN '🟠 High Risk'
    ELSE '🟡 Monitor'
  END as risk_level
FROM publisher_history h
LEFT JOIN recent_activity r ON h.pid = r.pid
ORDER BY recent_30d_revenue ASC, h.total_historical_revenue DESC
LIMIT 100
      `.trim()
    },
  },

  {
    id: 'new_publishers_performance',
    title: 'New Publishers Performance Tracker',
    description: 'Monitor revenue and activation of newly onboarded publishers',
    category: CATEGORIES.CUSTOMER,
    sourceTable: 'Sales_New_sales_master',
    fields: [
      {
        name: 'cohort_months',
        label: 'Onboarded In Last (Months)',
        type: 'select',
        options: ['1', '3', '6', '12'],
        defaultValue: '3',
      },
      {
        name: 'activation_metric',
        label: 'Track Activation By',
        type: 'select',
        options: ['revenue', 'impressions', 'days_active'],
        defaultValue: 'revenue',
      },
    ],
    buildQuery: (params) => {
      const months = params.cohort_months || '3'
      const metric = params.activation_metric || 'revenue'
      const metricMap = { revenue: 'rev', impressions: 'req', days_active: 'DATE' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH new_publishers AS (
  SELECT
    pid,
    pubname,
    CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
    MIN(DATE) as first_activity_date
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${months} MONTH)
  GROUP BY pid, pubname, team
),
performance AS (
  SELECT
    np.pid,
    np.pubname,
    np.team,
    np.first_activity_date,
    DATE_DIFF(CURRENT_DATE(), np.first_activity_date, DAY) as days_since_onboard,
    SUM(CAST(rev AS FLOAT64)) as total_revenue,
    SUM(CAST(req AS FLOAT64)) as total_impressions,
    COUNT(DISTINCT DATE) as active_days
  FROM new_publishers np
  LEFT JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` p ON np.pid = p.pid
  GROUP BY np.pid, np.pubname, np.team, np.first_activity_date
)
SELECT
  pid,
  pubname,
  team,
  first_activity_date,
  days_since_onboard,
  total_revenue,
  total_impressions,
  active_days,
  ROUND(total_revenue / NULLIF(days_since_onboard, 0), 2) as daily_avg_revenue,
  CASE
    WHEN active_days = 0 THEN '⚪ Not Started'
    WHEN total_revenue > 0 THEN '🟢 Active'
    WHEN total_impressions > 0 THEN '🟡 Getting Impressions'
    ELSE '🔴 Not Active'
  END as onboarding_status
FROM performance
ORDER BY first_activity_date DESC, total_revenue DESC
LIMIT 100
      `.trim()
    },
  },

  {
    id: 'customer_summary_overview',
    title: 'Customer Summary Overview',
    description: 'Show publisher category breakdowns: Active, Growing, Declining, Churn',
    category: CATEGORIES.CUSTOMER,
    sourceTable: 'CS_Customer_summary_dashboard',
    fields: [
      {
        name: 'grouping',
        label: 'Group By',
        type: 'select',
        options: ['status', 'team', 'product_mix'],
        defaultValue: 'status',
      },
      {
        name: 'metric',
        label: 'Primary Metric',
        type: 'select',
        options: ['revenue', 'profit', 'publisher_count'],
        defaultValue: 'revenue',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const grouping = params.grouping || 'status'
      const metricMap = { revenue: 'rev', profit: 'profit', publisher_count: 'COUNT' }
      const metricCol = metricMap[metric] || 'rev'

      const groupByClause =
        grouping === 'team'
          ? 'team'
          : grouping === 'product_mix'
            ? 'has_multiple_products'
            : 'customer_status'

      return `
WITH publisher_status AS (
  SELECT
    pid,
    pubname,
    CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
    (SELECT COUNT(DISTINCT product) FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` p2 WHERE p2.pid = p1.pid) > 1 as has_multiple_products,
    SUM(CAST(${metricCol} AS FLOAT64)) as total_metric_30d,
    COUNT(DISTINCT DATE) as active_days,
    LAG(SUM(CAST(${metricCol} AS FLOAT64))) OVER(PARTITION BY pid ORDER BY DATE) as prev_day_metric,
    CASE
      WHEN COUNT(DISTINCT DATE) = 0 THEN 'Inactive'
      WHEN SUM(CAST(${metricCol} AS FLOAT64)) > LAG(SUM(CAST(${metricCol} AS FLOAT64))) OVER(PARTITION BY pid ORDER BY DATE) THEN 'Growing'
      WHEN SUM(CAST(${metricCol} AS FLOAT64)) < LAG(SUM(CAST(${metricCol} AS FLOAT64))) OVER(PARTITION BY pid ORDER BY DATE) * 0.9 THEN 'Declining'
      ELSE 'Stable'
    END as customer_status
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` p1
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY pid, pubname, team
)
SELECT
  ${groupByClause} as category,
  COUNT(DISTINCT pid) as publisher_count,
  SUM(CAST(total_metric_30d AS FLOAT64)) as total_${metric},
  ROUND(AVG(active_days), 1) as avg_active_days,
  ROUND(SUM(CAST(total_metric_30d AS FLOAT64)) / COUNT(DISTINCT pid), 2) as avg_${metric}_per_publisher
FROM publisher_status
GROUP BY ${groupByClause}
ORDER BY total_${metric} DESC
      `.trim()
    },
  },
]
