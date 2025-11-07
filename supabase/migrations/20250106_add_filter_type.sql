-- Add filter_type column to distinguish between standard presets and advanced filters
-- This allows us to use the same table for both filter preset types

-- Add the column with a default value
ALTER TABLE filter_presets
ADD COLUMN IF NOT EXISTS filter_type TEXT DEFAULT 'standard';

-- Add constraint to ensure only valid values
ALTER TABLE filter_presets
ADD CONSTRAINT valid_filter_type CHECK (filter_type IN ('standard', 'advanced'));

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_page_type
ON filter_presets(user_id, page, filter_type);

-- Add comment
COMMENT ON COLUMN filter_presets.filter_type IS 'Type of filter: ''standard'' for regular presets, ''advanced'' for advanced filter management system';
