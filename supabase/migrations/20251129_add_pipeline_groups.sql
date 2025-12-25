-- Add pipeline group support
-- This migration adds a 'group' column to the pipelines table to support
-- separate Sales and CS pipeline groups. Each POC can have multiple pipelines
-- within a group.

-- Add group column to pipelines table
ALTER TABLE pipelines
ADD COLUMN IF NOT EXISTS "group" VARCHAR(50) DEFAULT 'sales'
CHECK ("group" IN ('sales', 'cs'));

-- Set default group for existing pipelines
UPDATE pipelines SET "group" = 'sales' WHERE "group" IS NULL;

-- Add index for faster filtering by group
CREATE INDEX IF NOT EXISTS idx_pipelines_group ON pipelines("group");

-- Add comment for documentation
COMMENT ON COLUMN pipelines."group" IS 'Pipeline group: sales or cs. Each POC can have multiple pipelines within a group.';
