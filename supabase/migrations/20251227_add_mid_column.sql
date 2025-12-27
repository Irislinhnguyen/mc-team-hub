-- Add mid column to pipelines table
-- This column stores Media ID / Site ID and is synced to Google Sheets column I (index 8)

ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS mid TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pipelines_mid ON pipelines(mid);

-- Add comment
COMMENT ON COLUMN pipelines.mid IS 'Media ID / Site ID - synced to Google Sheets column I';
