import { AnalyticsTemplate, CATEGORIES } from './types'

/**
 * Category 5: Sales / Revenue Tracking Templates (2 templates)
 * Monthly sales overview and new sales activation report
 */

export const salesRevenueTemplates: AnalyticsTemplate[] = [
  {
    id: 'final_sales_monthly',
    title: 'Final Monthly Sales Overview',
    description: 'Aggregated monthly revenue and profit by PIC/team',
    category: CATEGORIES.SALES,
    sourceTable: 'Sales_final_sales_monthly',
    fields: [
      {
        name: 'grouping',
        label: 'Group By',
        type: 'select',
        options: ['pic', 'team', 'product'],
        defaultValue: 'pic',
      },
      {
        name: 'month_range',
        label: 'Show Months',
        type: 'select',
        options: ['current', 'last 3', 'last 6', 'last 12'],
        defaultValue: 'last 3',
      },
    ],
    buildQuery: (params) => {
      const grouping = params.grouping || 'pic'
      const months =
        params.month_range === 'last 6'
          ? '180'
          : params.month_range === 'last 12'
            ? '365'
            : params.month_range === 'current'
              ? '31'
              : '90'

      const selectGroup =
        grouping === 'team'
          ? 'CASE WHEN pic LIKE "APP%" THEN "APP_GV" WHEN pic LIKE "VN%" THEN "WEB_GV" ELSE "WEB_GTI" END'
          : grouping === 'product'
            ? 'product'
            : 'pic'

      return `
WITH monthly_sales AS (
  SELECT
    DATE_TRUNC(DATE, MONTH) as month,
    ${selectGroup} as grouping,
    SUM(CAST(rev AS FLOAT64)) as monthly_revenue,
    SUM(CAST(profit AS FLOAT64)) as monthly_profit,
    COUNT(DISTINCT pid) as num_publishers,
    COUNT(*) as record_count
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${months} DAY)
  GROUP BY month, grouping
)
SELECT
  month,
  grouping,
  monthly_revenue,
  monthly_profit,
  ROUND(monthly_profit / NULLIF(monthly_revenue, 0) * 100, 2) as profit_margin_pct,
  num_publishers,
  record_count,
  ROUND(monthly_revenue / NULLIF(record_count, 0), 2) as avg_per_record,
  LAG(monthly_revenue) OVER(PARTITION BY grouping ORDER BY month) as prev_month_revenue,
  ROUND((monthly_revenue - LAG(monthly_revenue) OVER(PARTITION BY grouping ORDER BY month)) / LAG(monthly_revenue) OVER(PARTITION BY grouping ORDER BY month) * 100, 2) as mom_growth_pct
FROM monthly_sales
ORDER BY month DESC, grouping
      `.trim()
    },
  },

  {
    id: 'new_sales_activation',
    title: 'New Sales Activation Report',
    description: 'Track newly onboarded PIDs and their revenue contribution',
    category: CATEGORIES.SALES,
    sourceTable: 'Sales_New_sales_master',
    fields: [
      {
        name: 'cohort_months',
        label: 'New Sales From Last (Months)',
        type: 'select',
        options: ['1', '2', '3', '6'],
        defaultValue: '3',
      },
      {
        name: 'activation_metric',
        label: 'Track By',
        type: 'select',
        options: ['revenue', 'transaction_count', 'average_value'],
        defaultValue: 'revenue',
      },
      {
        name: 'min_target',
        label: 'Min Target Revenue ($)',
        type: 'number',
        defaultValue: '1000',
      },
    ],
    buildQuery: (params) => {
      const months = params.cohort_months || '3'
      const metric = params.activation_metric || 'revenue'
      const minTarget = params.min_target || '1000'

      return `
WITH new_sales_cohort AS (
  SELECT
    pid,
    pubname,
    pic,
    MIN(DATE) as first_sale_date
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL ${months} MONTH)
  GROUP BY pid, pubname, pic
  HAVING SUM(CAST(rev AS FLOAT64)) >= ${minTarget}
),
sales_performance AS (
  SELECT
    nsc.pid,
    nsc.pubname,
    nsc.pic,
    nsc.first_sale_date,
    DATE_DIFF(CURRENT_DATE(), nsc.first_sale_date, DAY) as days_since_start,
    SUM(CAST(rev AS FLOAT64)) as total_revenue,
    SUM(CAST(req AS FLOAT64)) as total_impressions,
    COUNT(DISTINCT DATE) as active_days
  FROM new_sales_cohort nsc
  LEFT JOIN \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\` s ON nsc.pid = s.pid
  WHERE s.DATE >= nsc.first_sale_date
  GROUP BY nsc.pid, nsc.pubname, nsc.pic, nsc.first_sale_date
)
SELECT
  pid,
  pubname,
  pic,
  first_sale_date,
  days_since_start,
  total_revenue,
  total_impressions,
  active_days,
  ROUND(total_revenue / NULLIF(active_days, 0), 2) as daily_avg_revenue,
  CASE
    WHEN days_since_start < 30 THEN '🆕 Very New'
    WHEN total_revenue >= ${minTarget} THEN '🟢 On Track'
    WHEN total_revenue >= ${minTarget} * 0.5 THEN '🟡 Behind'
    WHEN total_revenue > 0 THEN '🔴 At Risk'
    ELSE '⚪ Not Started'
  END as activation_status
FROM sales_performance
ORDER BY first_sale_date DESC, total_revenue DESC
LIMIT 100
      `.trim()
    },
  },
]
