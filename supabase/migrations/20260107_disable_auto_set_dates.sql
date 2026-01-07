-- ========================================
-- Disable Auto-Set Status Dates Trigger
-- ========================================
-- Purpose: Stop auto-calculating status transition dates
-- Reason: All dates now synced directly from Google Sheets
--
-- Changes:
-- 1. Drop trigger that auto-sets dates on status change
-- 2. Mark function as disabled for potential future use
-- ========================================

-- Drop the trigger that auto-sets status dates
DROP TRIGGER IF EXISTS auto_set_status_dates_trigger ON pipelines;

-- Add comment to function explaining why it's disabled
COMMENT ON FUNCTION auto_set_status_dates() IS
  'DISABLED 2026-01-07: Status transition dates are now synced directly from Google Sheets. This function is kept for potential future use but the trigger has been removed.';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Auto-set status dates trigger has been disabled';
  RAISE NOTICE 'All status transition dates will now be synced from Google Sheets';
END $$;
