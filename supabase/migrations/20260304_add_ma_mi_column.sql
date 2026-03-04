-- ========================================
-- Add ma_mi Column to Pipelines Table
-- ========================================
-- Purpose: Add the missing ma_mi (MA/MI) column that exists in Google Sheets
-- This column is in column E of the SEA_Sales sheet

-- Add the column if it doesn't exist
ALTER TABLE pipelines
ADD COLUMN IF NOT EXISTS ma_mi TEXT;

-- Add comment for documentation
COMMENT ON COLUMN pipelines.ma_mi IS 'MA/MI field from Google Sheets (Column E in Sales sheet)';

-- Create index for better query performance if this field is used frequently
CREATE INDEX IF NOT EXISTS idx_pipelines_ma_mi ON pipelines(ma_mi) WHERE ma_mi IS NOT NULL;

-- ✅ Migration complete
-- The ma_mi column is now available for syncing from Google Sheets