import { AnalyticsTemplate, CATEGORIES } from './types'

/**
 * Category 3: Format Insights Templates (4 templates)
 * Ad format performance, format comparison, format by team, and upsell opportunities
 */

export const formatTemplates: AnalyticsTemplate[] = [
  {
    id: 'adformat_growth_decline',
    title: 'Ad Format Growth & Decline',
    description: 'Identify which ad formats (products) are growing or dropping the most this month',
    category: CATEGORIES.FORMAT,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'metric',
        label: 'Metric to Track',
        type: 'select',
        options: ['revenue', 'profit', 'impressions', 'requests'],
        defaultValue: 'revenue',
      },
      {
        name: 'compare_to',
        label: 'Compare To',
        type: 'select',
        options: ['last month', 'last quarter', 'year ago'],
        defaultValue: 'last month',
      },
    ],
    buildQuery: (params) => {
      const metric = params.metric || 'revenue'
      const period = params.compare_to === 'last quarter' ? '90' : params.compare_to === 'year ago' ? '365' : '30'
      const metricMap = { revenue: 'rev', profit: 'profit', impressions: 'req', requests: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH current_month AS (
  SELECT
    product,
    SUM(CAST(${metricCol} AS FLOAT64)) as current_${metric}
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY product
),
previous_period AS (
  SELECT
    product,
    SUM(CAST(${metricCol} AS FLOAT64)) as previous_${metric}
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL ${period} DAY)
  AND DATE < DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY product
)
SELECT
  c.product,
  c.current_${metric},
  p.previous_${metric},
  ROUND((c.current_${metric} - COALESCE(p.previous_${metric}, c.current_${metric})) / NULLIF(COALESCE(p.previous_${metric}, c.current_${metric}), 0) * 100, 2) as growth_pct,
  CASE
    WHEN p.previous_${metric} IS NULL THEN '🆕 New Format'
    WHEN COALESCE(p.previous_${metric}, 0) = 0 THEN '🆕 New Format'
    WHEN (c.current_${metric} - p.previous_${metric}) / NULLIF(p.previous_${metric}, 0) > 0.2 THEN '📈 Strong Growth'
    WHEN (c.current_${metric} - p.previous_${metric}) / NULLIF(p.previous_${metric}, 0) > 0 THEN '📊 Growing'
    WHEN (c.current_${metric} - p.previous_${metric}) / NULLIF(p.previous_${metric}, 0) > -0.1 THEN '➡️ Stable'
    ELSE '📉 Declining'
  END as trend
FROM current_month c
LEFT JOIN previous_period p ON c.product = p.product
ORDER BY growth_pct DESC
LIMIT 50
      `.trim()
    },
  },

  {
    id: 'compare_two_formats',
    title: 'Compare Two Ad Formats',
    description: 'Benchmark two ad formats (e.g. WipeAd vs Flexible Sticky) by metrics and trends',
    category: CATEGORIES.FORMAT,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'format1',
        label: 'Format 1',
        type: 'text',
        placeholder: 'e.g., WipeAd',
        required: true,
      },
      {
        name: 'format2',
        label: 'Format 2',
        type: 'text',
        placeholder: 'e.g., Flexible Sticky',
        required: true,
      },
      {
        name: 'days_back',
        label: 'Time Period (Days)',
        type: 'select',
        options: ['7', '14', '30', '60', '90'],
        defaultValue: '30',
      },
    ],
    buildQuery: (params) => {
      const format1 = params.format1 || 'WipeAd'
      const format2 = params.format2 || 'Sticky'
      const daysBack = params.days_back || '30'

      return `
WITH format_metrics AS (
  SELECT
    product as format,
    COUNT(*) as records,
    SUM(CAST(rev AS FLOAT64)) as total_revenue,
    SUM(CAST(profit AS FLOAT64)) as total_profit,
    SUM(CAST(impressions AS FLOAT64)) as total_impressions,
    SUM(CAST(requests AS FLOAT64)) as total_requests,
    COUNT(DISTINCT pid) as num_publishers,
    AVG(CAST(rpm AS FLOAT64)) as avg_rpm
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
  AND product IN ('${format1}', '${format2}')
  GROUP BY format
)
SELECT
  format,
  records,
  total_revenue,
  total_profit,
  total_impressions,
  total_requests,
  num_publishers,
  ROUND(avg_rpm, 2) as avg_rpm,
  ROUND(total_revenue / total_impressions * 1000, 2) as ecpm,
  ROUND(total_revenue / total_requests, 2) as rev_per_request
FROM format_metrics
ORDER BY total_revenue DESC
      `.trim()
    },
  },

  {
    id: 'format_performance_by_team',
    title: 'Format Performance by Team',
    description: 'Compare how each team performs with the same format (e.g. Sticky across WEB_GV vs APP_GV)',
    category: CATEGORIES.FORMAT,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'format',
        label: 'Ad Format',
        type: 'text',
        placeholder: 'e.g., Sticky, Expandable',
        required: true,
      },
      {
        name: 'metric',
        label: 'Compare By',
        type: 'select',
        options: ['revenue', 'profit', 'rpm', 'impressions'],
        defaultValue: 'revenue',
      },
    ],
    buildQuery: (params) => {
      const format = params.format || 'Sticky'
      const metric = params.metric || 'revenue'
      const metricMap = { revenue: 'rev', profit: 'profit', rpm: 'req', impressions: 'req' }
      const metricCol = metricMap[metric] || 'rev'

      return `
WITH team_format_data AS (
  SELECT
    CASE
      WHEN pic LIKE 'APP%' THEN 'APP_GV'
      WHEN pic LIKE 'VN%' THEN 'WEB_GV'
      WHEN pic LIKE 'ID%' THEN 'WEB_GTI'
      ELSE 'OTHER'
    END as team,
    SUM(CAST(${metricCol} AS FLOAT64)) as total_${metric},
    SUM(CAST(req AS FLOAT64)) as total_requests,
    COUNT(DISTINCT pid) as num_publishers,
    COUNT(*) as records
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE product LIKE '%${format}%'
  AND DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY team
)
SELECT
  team,
  total_${metric},
  num_publishers,
  records,
  ROUND(total_${metric} / num_publishers, 2) as avg_${metric}_per_publisher,
  ROUND(total_${metric} / total_requests * 1000, 2) as ecpm
FROM team_format_data
WHERE team != 'OTHER'
ORDER BY total_${metric} DESC
      `.trim()
    },
  },

  {
    id: 'upsell_opportunity',
    title: 'Upsell Opportunity Finder',
    description: 'Suggest unused formats a publisher could adopt based on peer performance',
    category: CATEGORIES.FORMAT,
    sourceTable: 'GI_publisher.agg_monthly_with_pic_table',
    fields: [
      {
        name: 'top_n',
        label: 'Top N Opportunities',
        type: 'select',
        options: ['5', '10', '20', '50'],
        defaultValue: '10',
      },
      {
        name: 'min_peer_revenue',
        label: 'Peer Min Revenue ($)',
        type: 'number',
        defaultValue: '1000',
      },
    ],
    buildQuery: (params) => {
      const topN = params.top_n || '10'
      const minRevenue = params.min_peer_revenue || '1000'

      return `
WITH all_formats AS (
  SELECT DISTINCT product FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
),
publisher_formats AS (
  SELECT DISTINCT pid, product FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
),
format_performance AS (
  SELECT
    product,
    SUM(CAST(rev AS FLOAT64)) as total_revenue,
    AVG(CAST(rpm AS FLOAT64)) as avg_rpm,
    COUNT(DISTINCT pid) as using_count
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY product
  HAVING SUM(CAST(rev AS FLOAT64)) > ${minRevenue}
)
SELECT
  af.product,
  fp.using_count,
  fp.total_revenue,
  ROUND(fp.avg_rpm, 2) as avg_rpm,
  COUNT(DISTINCT pf.pid) as publishers_without_format,
  RANK() OVER(ORDER BY fp.total_revenue DESC) as opportunity_rank
FROM all_formats af
LEFT JOIN format_performance fp ON af.product = fp.product
LEFT JOIN publisher_formats pf ON af.product = pf.product
WHERE af.product NOT IN (SELECT product FROM publisher_formats WHERE pid IN (SELECT pid FROM publisher_formats LIMIT 100))
GROUP BY af.product, fp.using_count, fp.total_revenue, fp.avg_rpm
ORDER BY opportunity_rank
LIMIT ${topN}
      `.trim()
    },
  },
]
