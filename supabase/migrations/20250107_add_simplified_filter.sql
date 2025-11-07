-- Add simplified_filter column to filter_presets table
-- This column stores the new advanced filter structure with entity operators

ALTER TABLE filter_presets
ADD COLUMN IF NOT EXISTS simplified_filter JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN filter_presets.simplified_filter IS 'Stores SimplifiedFilter structure for advanced filters with entity operators (e.g., ZID has product equals video)';

-- Create index for faster queries on filters with simplified_filter
CREATE INDEX IF NOT EXISTS idx_filter_presets_has_simplified
ON filter_presets((simplified_filter IS NOT NULL))
WHERE simplified_filter IS NOT NULL;
