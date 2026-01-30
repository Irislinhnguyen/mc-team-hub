-- ========================================
-- Fix CS and Sales Pipeline Column Mapping
-- ========================================
-- Problem: Both CS and Sales sheets had column mapping issues
--
-- CS Issues (columns 9-10):
--   Column 9 (J): ZID data → stored in 'channel' field (WRONG)
--   Column 10 (K): Channel data → stored in 'region' field (WRONG)
--
-- Sales Issues (columns 4-37): Major systematic misalignment
--   Multiple columns were incorrectly mapped, causing data corruption
--
-- This migration fixes existing pipeline data for both groups
-- ========================================

-- Step 1: Backup current pipeline data to temp tables
CREATE TEMP TABLE cs_pipeline_backup AS
SELECT
  id,
  key,
  channel as old_channel,  -- Currently contains ZID data
  region as old_region,    -- Currently contains Channel data
  zid as old_zid,          -- Currently NULL
  quarterly_sheet_id,
  sheet_row_number
FROM pipelines
WHERE "group" = 'cs';

CREATE TEMP TABLE sales_pipeline_backup AS
SELECT
  id,
  key,
  pid as old_pid,
  publisher as old_publisher,
  product as old_product,
  channel as old_channel,
  region as old_region,
  competitors as old_competitors,
  description as old_description,
  zid as old_zid,
  c_plus_upgrade as old_c_plus_upgrade,
  quarterly_sheet_id,
  sheet_row_number
FROM pipelines
WHERE "group" = 'sales';

-- Step 2: Fix CS pipelines
UPDATE pipelines
SET
  zid = channel,           -- Move ZID from channel to zid
  channel = region,        -- Move Channel from region to channel
  region = NULL,           -- CS sheet doesn't have region
  updated_at = NOW()
WHERE "group" = 'cs'
  AND quarterly_sheet_id IS NOT NULL;  -- Only fix synced pipelines

-- Step 3: Log CS migration results
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM pipelines
  WHERE "group" = 'cs'
    AND quarterly_sheet_id IS NOT NULL
    AND zid IS NOT NULL;

  RAISE NOTICE 'CS Migration completed: Fixed % CS pipelines', affected_count;
END $$;

-- Step 4: Sales pipelines - Since Sales has major corruption,
-- we recommend a FULL RE-SYNC from Google Sheets instead of data migration
-- The following comment explains why:

/*
SALES PIPELINES NOTE:
===================
Sales pipelines have 11+ columns misaligned (columns 4-37).
Data migration would be extremely complex and error-prone because:
- Product data is in 'channel' field
- Channel data is in 'region' field
- Revenue data may be corrupted (Product → day_gross)
- Multiple other fields are misaligned

RECOMMENDATION:
Instead of migrating corrupt data, we recommend:
1. Delete existing Sales pipelines that were synced
2. Re-sync from Google Sheets with the corrected mapping

To delete existing Sales sync data (CAREFUL!):
-- DELETE FROM pipelines WHERE "group" = 'sales' AND quarterly_sheet_id IS NOT NULL;

Then trigger a full re-sync from Google Sheets.
*/

-- Step 5: Create index for CS ZID lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_pipelines_cs_zid
ON pipelines(zid)
WHERE "group" = 'cs' AND zid IS NOT NULL;

COMMENT ON INDEX idx_pipelines_cs_zid IS 'Index for CS pipeline ZID lookups';

-- Verification Queries (run manually to verify results)
-- ========================================

-- CS Verification:
-- SELECT
--   id,
--   key,
--   publisher,
--   channel,  -- Should now contain Channel data
--   region,   -- Should be NULL for CS
--   zid,      -- Should now contain ZID data
--   "group"
-- FROM pipelines
-- WHERE "group" = 'cs'
--   AND quarterly_sheet_id IS NOT NULL
-- LIMIT 10;

-- CS Data Distribution:
-- SELECT
--   COUNT(*) as total_cs_pipelines,
--   COUNT(zid) as pipelines_with_zid,
--   COUNT(channel) as pipelines_with_channel,
--   COUNT(region) as pipelines_with_region,
--   COUNT(CASE WHEN region IS NOT NULL THEN 1 END) as unexpected_region_count
-- FROM pipelines
-- WHERE "group" = 'cs';

-- Sales Verification (check if re-sync needed):
-- SELECT
--   COUNT(*) as total_sales_pipelines,
--   COUNT(quarterly_sheet_id) as synced_sales_pipelines
-- FROM pipelines
-- WHERE "group" = 'sales';
