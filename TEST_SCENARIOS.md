# Sales Team Test Scenarios

Các tình huống thực tế mà sales sẽ hỏi khi sử dụng platform.

---

## Scenario 1: "So sánh performance hôm qua với trung bình 30 ngày"
**Sales asks:** "Hôm qua team nào performance tốt nhất? Revenue có tăng hay giảm so với bình thường?"

**Template Used:** `team_daily_vs_30d` (Performance Analysis)

**Query to Test:**
```sql
WITH yesterday_data AS (
  SELECT 1, SUM(CAST(rev AS FLOAT64)) as yesterday_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  GROUP BY 1
),
avg_30d AS (
  SELECT 1, AVG(CAST(rev AS FLOAT64)) as avg_30d_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND DATE < CURRENT_DATE()
  GROUP BY 1
)
SELECT y.yesterday_revenue, a.avg_30d_revenue, ROUND((y.yesterday_revenue - a.avg_30d_revenue) / a.avg_30d_revenue * 100, 2) as variance_pct
FROM yesterday_data y
LEFT JOIN avg_30d a ON y.1 = a.1
```

**Expected Output:** Hiển thị tổng revenue hôm qua vs trung bình 30 ngày, % thay đổi

---

## Scenario 2: "Publishers nào tăng/giảm nhiều nhất hôm qua?"
**Sales asks:** "Hôm qua có publisher nào có revenue spike? Ai bị drop?"

**Template Used:** `top_movers_daily` (Performance Analysis)

**Query to Test:**
```sql
SELECT
  pid,
  pubname,
  team,
  product,
  yesterday_revenue,
  today_revenue,
  ROUND((today_revenue - yesterday_revenue) / yesterday_revenue * 100, 2) as pct_change,
  ROUND(today_revenue - yesterday_revenue, 2) as absolute_change
FROM `gcpp-check.CS_Top_movers_daily`
WHERE CURRENT_DATE() = CURRENT_DATE()
ORDER BY ABS(pct_change) DESC
LIMIT 20
```

**Expected Output:** Top 20 publishers với biggest day-over-day changes (gains & losers)

---

## Scenario 3: "Publisher XYZ revenue bị drop, nguyên nhân là gì?"
**Sales asks:** "Vì sao publisher PID-12345 revenue giảm? Format nào bị drop? Zone nào problem?"

**Template Used:** `pid_deep_dive` (Performance Analysis)

**Query to Test (Example with PID-12345):**
```sql
WITH breakdown AS (
  SELECT
    product,
    zonename,
    SUM(CAST(rev AS FLOAT64)) as revenue,
    COUNT(*) as records
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE pid = 'PID-12345'
  AND DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  GROUP BY product, zonename
)
SELECT
  product,
  zonename,
  revenue,
  records,
  ROUND(revenue / SUM(revenue) OVER() * 100, 2) as pct_of_total
FROM breakdown
ORDER BY revenue DESC
```

**Expected Output:** Chi tiết revenue breakdown by product & zone cho publisher

---

## Scenario 4: "Top 50 publishers theo revenue month này"
**Sales asks:** "Siapa aja top 50 publishers bulan ini? Revenue mereka berapa?"

**Template Used:** `top_publishers_by_metric` (Customer/Risk)

**Query to Test:**
```sql
SELECT
  pid,
  pubname,
  CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
  SUM(CAST(rev AS FLOAT64)) as total_revenue,
  COUNT(DISTINCT DATE) as active_days,
  COUNT(DISTINCT product) as formats_used,
  COUNT(DISTINCT zid) as zones_active,
  ROUND(SUM(CAST(rev AS FLOAT64)) / COUNT(DISTINCT DATE), 2) as daily_avg_revenue
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY pid, pubname, team
ORDER BY total_revenue DESC
LIMIT 50
```

**Expected Output:** Top 50 publishers dengan revenue, active days, formats used, zones

---

## Scenario 5: "Publishers nào có risk churn?"
**Sales asks:** "Ada publisher yang dulu revenue besar tapi sekarang drop drastis? Siapa yang perlu follow-up?"

**Template Used:** `churn_risk_detector` (Customer/Risk)

**Query to Test:**
```sql
WITH publisher_history AS (
  SELECT
    pid,
    pubname,
    CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
    SUM(CAST(rev AS FLOAT64)) as total_historical_revenue,
    MAX(DATE) as last_active_date,
    COUNT(DISTINCT DATE) as active_days_total
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  GROUP BY pid, pubname, team
  HAVING SUM(CAST(rev AS FLOAT64)) > 5000
),
recent_activity AS (
  SELECT
    pid,
    SUM(CAST(rev AS FLOAT64)) as recent_30d_revenue,
    COUNT(DISTINCT DATE) as active_days_30d
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
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
    WHEN COALESCE(r.recent_30d_revenue, 0) / (h.total_historical_revenue / 12) < 0.5 THEN '🟠 High Risk'
    ELSE '🟡 Monitor'
  END as risk_level
FROM publisher_history h
LEFT JOIN recent_activity r ON h.pid = r.pid
ORDER BY recent_30d_revenue ASC, h.total_historical_revenue DESC
LIMIT 100
```

**Expected Output:** Publishers dengan churn risk, trend revenue, risk level classification

---

## Scenario 6: "Format apa yang sedang trending?"
**Sales asks:** "Format mana yang paling hot sekarang? WipeAd vs Sticky format mana bagus?"

**Template Used:** `adformat_growth_decline` (Format Insights)

**Query to Test:**
```sql
WITH current_month AS (
  SELECT
    product,
    SUM(CAST(rev AS FLOAT64)) as current_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY product
),
previous_period AS (
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
  c.current_revenue,
  p.previous_revenue,
  ROUND((c.current_revenue - p.previous_revenue) / p.previous_revenue * 100, 2) as growth_pct,
  CASE
    WHEN (c.current_revenue - p.previous_revenue) / p.previous_revenue > 0.2 THEN '📈 Strong Growth'
    WHEN (c.current_revenue - p.previous_revenue) / p.previous_revenue > 0 THEN '📊 Growing'
    WHEN (c.current_revenue - p.previous_revenue) / p.previous_revenue > -0.1 THEN '➡️ Stable'
    ELSE '📉 Declining'
  END as trend
FROM current_month c
LEFT JOIN previous_period p ON c.product = p.product
ORDER BY growth_pct DESC
LIMIT 50
```

**Expected Output:** Format trending dengan growth percentage, classification (Strong Growth/Growing/Stable/Declining)

---

## Scenario 7: "Team nào performance terbaik minggu ini?"
**Sales asks:** "Minggu ini team APP_GV, WEB_GV, WEB_GTI siapa yang terbaik?"

**Template Used:** `team_prediction_breakdown` (Prediction & Forecasting)

**Query to Test:**
```sql
SELECT
  CASE WHEN pic LIKE 'APP%' THEN 'APP_GV' WHEN pic LIKE 'VN%' THEN 'WEB_GV' ELSE 'WEB_GTI' END as team,
  DATE_TRUNC(DATE, WEEK) as week,
  SUM(CAST(rev AS FLOAT64)) as total_revenue,
  COUNT(DISTINCT pid) as num_publishers,
  COUNT(DISTINCT DATE) as days_active
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY team, week
ORDER BY week DESC, team
LIMIT 100
```

**Expected Output:** Team performance by week dengan revenue, num publishers, active days

---

## Scenario 8: "Monthly sales monthly overview"
**Sales asks:** "Revenue bulan ini gimana? Tren naik atau turun dibanding bulan lalu?"

**Template Used:** `final_sales_monthly` (Sales/Revenue)

**Query to Test:**
```sql
WITH monthly_sales AS (
  SELECT
    DATE_TRUNC(DATE, MONTH) as month,
    CASE WHEN pic LIKE "APP%" THEN "APP_GV" WHEN pic LIKE "VN%" THEN "WEB_GV" ELSE "WEB_GTI" END as grouping,
    SUM(CAST(rev AS FLOAT64)) as monthly_revenue,
    SUM(CAST(profit AS FLOAT64)) as monthly_profit,
    COUNT(DISTINCT pid) as num_publishers,
    COUNT(*) as record_count
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
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
```

**Expected Output:** Monthly revenue, profit, profit margin, MoM growth % by team

---

## Test Execution Plan

1. **Scenario 1** - Kiểm tra daily vs 30d average
2. **Scenario 3** - Deep dive vào một publisher cụ thể
3. **Scenario 5** - Churn risk detection
4. **Scenario 6** - Format trending analysis
5. **Scenario 8** - Monthly sales overview

**Status:** Siap untuk test di backend
