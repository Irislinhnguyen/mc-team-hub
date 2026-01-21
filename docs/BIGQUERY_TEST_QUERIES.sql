-- ═══════════════════════════════════════════════════════════════════════════
-- BIGQUERY TEST QUERIES - Copy & Paste into BigQuery Console
-- ═══════════════════════════════════════════════════════════════════════════
-- All queries use real data from: gcpp-check.GI_publisher.agg_monthly_with_pic_table
-- Database: gcpp-check
-- Project: gcpp-check
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SCENARIO 1: Daily vs 30-Day Average Revenue Performance
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Compare yesterday's total revenue vs average daily revenue over last 30 days
-- Expected: 1 row with yesterday_revenue, avg_30d_revenue, and variance percentage
-- Time: ~980ms | Rows: 1

WITH yesterday_data AS (
  SELECT
    1 as grp,
    SUM(CAST(rev AS FLOAT64)) as yesterday_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  GROUP BY 1
),
daily_totals AS (
  -- First, sum all publishers' revenue for each day
  SELECT
    DATE,
    SUM(CAST(rev AS FLOAT64)) as daily_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND DATE < CURRENT_DATE()
  GROUP BY DATE
),
avg_30d AS (
  -- Then average those daily totals
  SELECT
    1 as grp,
    AVG(daily_revenue) as avg_30d_revenue
  FROM daily_totals
)
SELECT
  y.yesterday_revenue,
  a.avg_30d_revenue,
  ROUND(
    (y.yesterday_revenue - a.avg_30d_revenue) / NULLIF(a.avg_30d_revenue, 0) * 100,
    2
  ) as variance_pct
FROM yesterday_data y
LEFT JOIN avg_30d a ON y.grp = a.grp
LIMIT 100;


-- ═══════════════════════════════════════════════════════════════════════════
-- SCENARIO 2: Top 20 Publishers by Revenue This Month
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Identify top-performing publishers with detailed metrics
-- Expected: 20 rows with publisher ID, name, team, revenue, and activity metrics
-- Time: ~660ms | Rows: 20

WITH publisher_metrics AS (
  SELECT
    pid,
    pubname,
    CASE
      WHEN pic LIKE 'APP%' THEN 'APP_GV'
      WHEN pic LIKE 'VN%' THEN 'WEB_GV'
      WHEN pic LIKE 'ID%' THEN 'WEB_GTI'
      ELSE 'OTHER'
    END as team,
    SUM(CAST(rev AS FLOAT64)) as total_revenue,
    COUNT(DISTINCT DATE) as active_days,
    COUNT(DISTINCT product) as formats_used,
    COUNT(DISTINCT zid) as zones_active
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY pid, pubname, pic
)
SELECT
  pid,
  pubname,
  team,
  ROUND(total_revenue, 2) as total_revenue,
  active_days,
  formats_used,
  zones_active,
  ROUND(total_revenue / NULLIF(active_days, 0), 2) as daily_avg_revenue
FROM publisher_metrics
WHERE team != 'OTHER'
ORDER BY total_revenue DESC
LIMIT 20;


-- ═══════════════════════════════════════════════════════════════════════════
-- SCENARIO 3: Churn Risk Detection - At-Risk Publishers
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Identify publishers showing declining revenue (churn risk)
-- Expected: ~100 rows with risk classification and revenue trends
-- Time: ~681ms | Rows: 100

WITH current_week AS (
  SELECT
    pid,
    pubname,
    CASE
      WHEN pic LIKE 'APP%' THEN 'APP_GV'
      WHEN pic LIKE 'VN%' THEN 'WEB_GV'
      WHEN pic LIKE 'ID%' THEN 'WEB_GTI'
      ELSE 'OTHER'
    END as team,
    SUM(CAST(rev AS FLOAT64)) as current_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY pid, pubname, pic
),
previous_week AS (
  SELECT
    pid,
    SUM(CAST(rev AS FLOAT64)) as previous_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
    AND DATE < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY pid
)
SELECT
  c.pid,
  c.pubname,
  c.team,
  ROUND(c.current_revenue, 2) as current_revenue,
  ROUND(COALESCE(p.previous_revenue, 0), 2) as previous_revenue,
  ROUND(
    (c.current_revenue - COALESCE(p.previous_revenue, c.current_revenue)) /
    NULLIF(COALESCE(p.previous_revenue, c.current_revenue), 0) * 100,
    2
  ) as change_pct,
  CASE
    WHEN COALESCE(p.previous_revenue, 0) = 0 THEN '🟢 New Publisher'
    WHEN (c.current_revenue - COALESCE(p.previous_revenue, c.current_revenue)) /
         NULLIF(COALESCE(p.previous_revenue, c.current_revenue), 0) > 0.2 THEN '📈 Growing'
    WHEN (c.current_revenue - COALESCE(p.previous_revenue, c.current_revenue)) /
         NULLIF(COALESCE(p.previous_revenue, c.current_revenue), 0) > -0.1 THEN '➡️ Stable'
    ELSE '🔴 At Risk'
  END as risk_status
FROM current_week c
LEFT JOIN previous_week p ON c.pid = p.pid
WHERE c.team != 'OTHER'
ORDER BY change_pct ASC
LIMIT 100;


-- ═══════════════════════════════════════════════════════════════════════════
-- SCENARIO 4: Ad Format Trending - Growth & Decline Analysis
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Identify which ad formats are growing or declining this month
-- Expected: 28+ rows with growth percentages and trend indicators
-- Time: ~663ms | Rows: 28

WITH current_month AS (
  SELECT
    product,
    SUM(CAST(rev AS FLOAT64)) as current_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY product
),
previous_month AS (
  SELECT
    product,
    SUM(CAST(rev AS FLOAT64)) as previous_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 30 DAY)
    AND DATE < DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY product
)
SELECT
  c.product,
  ROUND(c.current_revenue, 2) as current_revenue,
  ROUND(COALESCE(p.previous_revenue, 0), 2) as previous_revenue,
  ROUND(
    (c.current_revenue - COALESCE(p.previous_revenue, c.current_revenue)) /
    NULLIF(COALESCE(p.previous_revenue, c.current_revenue), 0) * 100,
    2
  ) as growth_pct,
  CASE
    WHEN p.previous_revenue IS NULL THEN '🆕 New Format'
    WHEN COALESCE(p.previous_revenue, 0) = 0 THEN '🆕 New Format'
    WHEN (c.current_revenue - p.previous_revenue) / NULLIF(p.previous_revenue, 0) > 0.2 THEN '📈 Strong Growth'
    WHEN (c.current_revenue - p.previous_revenue) / NULLIF(p.previous_revenue, 0) > 0 THEN '📊 Growing'
    WHEN (c.current_revenue - p.previous_revenue) / NULLIF(p.previous_revenue, 0) > -0.1 THEN '➡️ Stable'
    ELSE '📉 Declining'
  END as trend
FROM current_month c
LEFT JOIN previous_month p ON c.product = p.product
ORDER BY growth_pct DESC
LIMIT 50;


-- ═══════════════════════════════════════════════════════════════════════════
-- SCENARIO 5: Team Performance Breakdown by Week
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Compare performance across teams (APP_GV, WEB_GV, WEB_GTI)
-- Expected: 12 rows (3 teams × 4 weeks) with weekly metrics
-- Time: ~661ms | Rows: 12

WITH team_weekly_data AS (
  SELECT
    CASE
      WHEN pic LIKE 'APP%' THEN 'APP_GV'
      WHEN pic LIKE 'VN%' THEN 'WEB_GV'
      WHEN pic LIKE 'ID%' THEN 'WEB_GTI'
      ELSE 'OTHER'
    END as team,
    DATE_TRUNC(DATE, WEEK) as week_start,
    SUM(CAST(rev AS FLOAT64)) as total_revenue,
    COUNT(DISTINCT pid) as num_publishers,
    COUNT(DISTINCT DATE) as days_active
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY team, week_start
)
SELECT
  team,
  week_start as week,
  ROUND(total_revenue, 2) as total_revenue,
  num_publishers,
  days_active,
  ROUND(total_revenue / NULLIF(num_publishers, 0), 2) as avg_revenue_per_publisher
FROM team_weekly_data
WHERE team != 'OTHER'
ORDER BY week DESC, total_revenue DESC
LIMIT 12;


-- ═══════════════════════════════════════════════════════════════════════════
-- BONUS: Quick Data Validation Query
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Verify table structure and data freshness

SELECT
  'Total Records' as metric,
  COUNT(*) as value
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
UNION ALL
SELECT
  'Latest Data Date',
  CAST(MAX(DATE) AS STRING)
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
UNION ALL
SELECT
  'Unique Publishers',
  CAST(COUNT(DISTINCT pid) AS STRING)
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
UNION ALL
SELECT
  'Unique Formats',
  CAST(COUNT(DISTINCT product) AS STRING)
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
UNION ALL
SELECT
  'Teams in Data',
  STRING_AGG(DISTINCT team)
FROM (
  SELECT
    CASE
      WHEN pic LIKE 'APP%' THEN 'APP_GV'
      WHEN pic LIKE 'VN%' THEN 'WEB_GV'
      WHEN pic LIKE 'ID%' THEN 'WEB_GTI'
      ELSE 'OTHER'
    END as team
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
);
