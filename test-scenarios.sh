#!/bin/bash

# Test Scenarios Runner for Query Stream AI
# Tests various sales use cases

API_URL="http://localhost:3000/api/bigquery/query"

echo "=========================================="
echo "Query Stream AI - Test Scenarios"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test a query
test_scenario() {
  local scenario_num=$1
  local scenario_name=$2
  local query=$3

  echo -e "${YELLOW}[Scenario $scenario_num]${NC} $scenario_name"
  echo "-------------------------------------------"

  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$query" | jq -R -s .)}")

  # Check if response contains error
  if echo "$response" | grep -q '"error"'; then
    echo -e "${RED}❌ FAILED${NC}"
    echo "Error: $(echo "$response" | jq -r '.error')"
  else
    count=$(echo "$response" | jq -r '.count // 0')
    echo -e "${GREEN}✅ SUCCESS${NC}"
    echo "Returned $count rows"
    echo "Sample data:"
    echo "$response" | jq '.rows[0:2]' 2>/dev/null || echo "$response" | head -20
  fi

  echo ""
}

# Wait for server to be ready
echo "Checking if server is running..."
if ! curl -s "$API_URL" -X GET > /dev/null 2>&1; then
  echo -e "${RED}Server is not responding. Please start the dev server first.${NC}"
  exit 1
fi
echo -e "${GREEN}Server is ready!${NC}"
echo ""

# Test Scenario 1: Daily vs 30d average
test_scenario 1 "Daily vs 30-Day Average Performance" \
'WITH yesterday_data AS (
  SELECT 1 as grp, SUM(CAST(rev AS FLOAT64)) as yesterday_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
  GROUP BY 1
),
avg_30d AS (
  SELECT 1 as grp, AVG(CAST(rev AS FLOAT64)) as avg_30d_revenue
  FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND DATE < CURRENT_DATE()
  GROUP BY 1
)
SELECT y.yesterday_revenue, a.avg_30d_revenue, ROUND((y.yesterday_revenue - a.avg_30d_revenue) / a.avg_30d_revenue * 100, 2) as variance_pct
FROM yesterday_data y
LEFT JOIN avg_30d a ON y.grp = a.grp'

# Test Scenario 2: Top 20 publishers this month
test_scenario 2 "Top 20 Publishers by Revenue (This Month)" \
'SELECT
  pid,
  pubname,
  CASE WHEN pic LIKE "APP%" THEN "APP_GV" WHEN pic LIKE "VN%" THEN "WEB_GV" ELSE "WEB_GTI" END as team,
  SUM(CAST(rev AS FLOAT64)) as total_revenue,
  COUNT(DISTINCT DATE) as active_days,
  ROUND(SUM(CAST(rev AS FLOAT64)) / COUNT(DISTINCT DATE), 2) as daily_avg_revenue
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY pid, pubname, team
ORDER BY total_revenue DESC
LIMIT 20'

# Test Scenario 3: Churn Risk Detection
test_scenario 3 "High Risk Publishers (Churn Risk Detector)" \
'WITH publisher_history AS (
  SELECT
    pid,
    pubname,
    CASE WHEN pic LIKE "APP%" THEN "APP_GV" WHEN pic LIKE "VN%" THEN "WEB_GV" ELSE "WEB_GTI" END as team,
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
  CASE
    WHEN COALESCE(r.recent_30d_revenue, 0) = 0 THEN "🔴 Inactive"
    WHEN COALESCE(r.recent_30d_revenue, 0) / (h.total_historical_revenue / 12) < 0.5 THEN "🟠 High Risk"
    ELSE "🟡 Monitor"
  END as risk_level
FROM publisher_history h
LEFT JOIN recent_activity r ON h.pid = r.pid
WHERE COALESCE(r.recent_30d_revenue, 0) < (h.total_historical_revenue / 12) * 0.5
ORDER BY recent_30d_revenue ASC, h.total_historical_revenue DESC
LIMIT 20'

# Test Scenario 4: Format Trending
test_scenario 4 "Ad Format Growth & Decline Analysis" \
'WITH current_month AS (
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
  ROUND((c.current_revenue - p.previous_revenue) / p.previous_revenue * 100, 2) as growth_pct
FROM current_month c
LEFT JOIN previous_period p ON c.product = p.product
ORDER BY growth_pct DESC
LIMIT 20'

# Test Scenario 5: Team Performance
test_scenario 5 "Team Performance Breakdown (Last 30 Days)" \
'SELECT
  CASE WHEN pic LIKE "APP%" THEN "APP_GV" WHEN pic LIKE "VN%" THEN "WEB_GV" ELSE "WEB_GTI" END as team,
  SUM(CAST(rev AS FLOAT64)) as total_revenue,
  SUM(CAST(profit AS FLOAT64)) as total_profit,
  COUNT(DISTINCT pid) as num_publishers,
  COUNT(DISTINCT DATE) as active_days
FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY team
ORDER BY total_revenue DESC'

echo ""
echo "=========================================="
echo -e "${GREEN}Test execution completed!${NC}"
echo "=========================================="
