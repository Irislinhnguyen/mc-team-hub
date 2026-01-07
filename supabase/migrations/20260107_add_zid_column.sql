-- ========================================
-- Add ZID Column to Pipelines
-- ========================================
-- Purpose: Add Zone ID column to support new Google Sheets format
--
-- Changes:
-- 1. Add zid column to pipelines table
-- 2. Add zid to deleted_pipelines archive table
-- ========================================

-- Add ZID column to pipelines
ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS zid TEXT;

COMMENT ON COLUMN pipelines.zid IS 'Zone ID - identifier for zones in the system';

-- Add ZID to deleted_pipelines archive table
ALTER TABLE deleted_pipelines
  ADD COLUMN IF NOT EXISTS zid TEXT;

-- Create index for zid lookups
CREATE INDEX IF NOT EXISTS idx_pipelines_zid ON pipelines(zid) WHERE zid IS NOT NULL;

COMMENT ON INDEX idx_pipelines_zid IS 'Index for efficient ZID lookups';
