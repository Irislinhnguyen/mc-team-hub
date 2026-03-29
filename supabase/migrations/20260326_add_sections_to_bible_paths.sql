-- Add sections field to bible_paths table
-- Stores array of section names for organizing articles within a path
-- Example: ["Basics", "Advanced", "Reference"]

ALTER TABLE bible_paths
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::JSONB;

-- Add comment
COMMENT ON COLUMN bible_paths.sections IS 'Array of section names for organizing articles within a path. Example: ["Basics", "Advanced"]';

-- Add index for sections queries
CREATE INDEX IF NOT EXISTS idx_bible_paths_sections ON bible_paths USING GIN (sections);
