-- Add quarterly_sheet_id to unique constraint
-- This allows the same pipeline to exist in multiple quarters (Q1, Q2, etc.)
-- while preventing duplicates within the same quarter

-- Drop old unique constraint (key, proposal_date)
DROP INDEX IF EXISTS idx_pipelines_key_proposal_date;

-- Create new composite unique constraint (key, proposal_date, quarterly_sheet_id)
-- This allows:
-- - Same pipeline in different quarterly sheets (different quarterly_sheet_id)
-- - But prevents duplicates within the same quarterly sheet
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_key_proposal_date_quarterly
  ON pipelines (key, COALESCE(proposal_date, '1900-01-01'::date), quarterly_sheet_id)
  WHERE key IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_pipelines_key_proposal_date_quarterly IS
'Unique constraint for pipelines within a quarterly sheet. Allows same pipeline across different quarters.';
