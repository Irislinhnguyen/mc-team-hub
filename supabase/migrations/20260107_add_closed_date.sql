-- ========================================
-- Add closed_date Column to Pipelines
-- ========================================
-- Purpose: Track when pipeline moved to status Z (Closed)
-- Synced from Google Sheets column AI (【Z】)
--
-- Changes:
-- 1. Add closed_date column to pipelines table
-- 2. Add closed_date to deleted_pipelines archive table
-- 3. Add index for efficient querying
-- ========================================

-- Add closed_date column to pipelines
ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS closed_date DATE;

COMMENT ON COLUMN pipelines.closed_date IS 'Date when pipeline moved to status Z (Closed) - synced from Google Sheets';

-- Add closed_date to deleted_pipelines archive table
ALTER TABLE deleted_pipelines
  ADD COLUMN IF NOT EXISTS closed_date DATE;

-- Create index for closed_date lookups
CREATE INDEX IF NOT EXISTS idx_pipelines_closed_date
  ON pipelines(closed_date) WHERE closed_date IS NOT NULL;

COMMENT ON INDEX idx_pipelines_closed_date IS 'Index for efficient closed date filtering and reporting';
