-- Add pipeline_poc_name column to team_pic_mappings
-- This allows mapping BigQuery PIC names to Pipeline POC names through teams
-- Example: VN_minhlh (BigQuery) → WEB_GV → Zenny (Pipeline)

-- Add pipeline_poc_name column
ALTER TABLE team_pic_mappings
ADD COLUMN IF NOT EXISTS pipeline_poc_name TEXT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_pic_mappings_pipeline_poc
ON team_pic_mappings(pipeline_poc_name);

-- Add comment
COMMENT ON COLUMN team_pic_mappings.pipeline_poc_name IS
'POC name as it appears in pipelines table (e.g., Zenny, Febri, Safitri). Maps BigQuery PIC names to Pipeline POC names.';
