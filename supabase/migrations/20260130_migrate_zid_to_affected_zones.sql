-- ========================================
-- Connect ZID Field to Impact Calculations
-- ========================================
-- Problem: New zid field (from Google Sheets) is NOT used in Impact calculations
-- Impact still uses affected_zones array which is NULL for all CS/Sales pipelines
--
-- Solution: Migrate zid → affected_zones to connect Google Sheet data to Impact
-- ========================================

-- Step 1: Migrate zid string to affected_zones array for CS/Sales pipelines
UPDATE pipelines
SET
  affected_zones = CASE
    WHEN zid IS NOT NULL THEN ARRAY[zid::TEXT]
    ELSE NULL
  END,
  updated_at = NOW()
WHERE "group" IN ('cs', 'sales')
  AND zid IS NOT NULL
  AND (affected_zones IS NULL OR array_length(affected_zones, 1) IS NULL);

-- Step 2: Log migration results
DO $$
DECLARE
  cs_migrated INTEGER;
  sales_migrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO cs_migrated
  FROM pipelines
  WHERE "group" = 'cs'
    AND affected_zones IS NOT NULL;

  SELECT COUNT(*) INTO sales_migrated
  FROM pipelines
  WHERE "group" = 'sales'
    AND affected_zones IS NOT NULL;

  RAISE NOTICE 'Migration completed: CS pipelines with affected_zones=%, Sales pipelines=%',
    cs_migrated, sales_migrated;
END $$;

-- Step 3: Verify results
SELECT
  "group",
  COUNT(*) as total_pipelines,
  COUNT(zid) as with_zid_field,
  COUNT(affected_zones) as with_affected_zones,
  COUNT(CASE WHEN zid IS NOT NULL AND affected_zones IS NOT NULL THEN 1 END) as with_both
FROM pipelines
WHERE "group" IN ('cs', 'sales')
GROUP BY "group"
ORDER BY "group";

-- Step 4: Show sample migrated data
SELECT
  id,
  "group",
  publisher,
  zid,
  affected_zones,
  pid,
  mid,
  actual_starting_date
FROM pipelines
WHERE "group" IN ('cs', 'sales')
  AND affected_zones IS NOT NULL
ORDER BY "group", created_at DESC
LIMIT 10;

-- Expected results after migration:
-- CS: 20 pipelines with affected_zones populated
-- Sales: 15 pipelines with affected_zones populated
-- These will now get ZID-level granularity in Impact calculations
