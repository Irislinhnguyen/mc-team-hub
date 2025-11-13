-- Check what team values exist in BigQuery
-- Run this query to see what team values are available

-- 1. Check if 'team' column exists and what values it contains
SELECT
  team,
  COUNT(*) as record_count,
  COUNT(DISTINCT pid) as publisher_count,
  SUM(rev) as total_revenue,
  MIN(DATE) as earliest_date,
  MAX(DATE) as latest_date
FROM `your-project.your-dataset.table_name`
WHERE DATE >= '2025-09-17'
  AND DATE <= '2025-11-11'
GROUP BY team
ORDER BY total_revenue DESC;

-- 2. Check if there's any data for team = 'App'
SELECT
  COUNT(*) as records,
  COUNT(DISTINCT pid) as publishers,
  SUM(req) as total_requests,
  SUM(rev) as total_revenue
FROM `your-project.your-dataset.table_name`
WHERE DATE >= '2025-09-17'
  AND DATE <= '2025-11-11'
  AND team = 'App';

-- 3. Check alternative: maybe it's a case sensitivity issue
SELECT
  COUNT(*) as records,
  COUNT(DISTINCT pid) as publishers,
  SUM(req) as total_requests,
  SUM(rev) as total_revenue
FROM `your-project.your-dataset.table_name`
WHERE DATE >= '2025-09-17'
  AND DATE <= '2025-11-11'
  AND UPPER(team) = 'APP';

-- 4. If 'team' column doesn't exist, check if there's a team mapping via 'pic'
-- (because the API code shows team perspective aggregates PICs)
SELECT
  pic,
  COUNT(*) as record_count,
  SUM(rev) as total_revenue
FROM `your-project.your-dataset.table_name`
WHERE DATE >= '2025-09-17'
  AND DATE <= '2025-11-11'
GROUP BY pic
ORDER BY total_revenue DESC
LIMIT 20;
