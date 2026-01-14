-- Add cannot_create_reason to pipeline_remarks table for global sync
-- This makes cannot_create_reason work like global remarks - shared across ALL focuses

-- Add columns for cannot_create_reason
ALTER TABLE pipeline_remarks
ADD COLUMN IF NOT EXISTS cannot_create_reason TEXT,
ADD COLUMN IF NOT EXISTS cannot_create_reason_other TEXT;

-- Add comments
COMMENT ON COLUMN pipeline_remarks.cannot_create_reason IS 'Global cannot create reason shared across all focuses - updated in one place, visible everywhere';
COMMENT ON COLUMN pipeline_remarks.cannot_create_reason_other IS 'Additional detail when cannot_create_reason is "Other"';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_remarks_reason
ON pipeline_remarks(mid, product, cannot_create_reason);

-- Backfill existing data from focus_suggestions to pipeline_remarks
-- This migrates existing cannot_create_reason values to the global table
INSERT INTO pipeline_remarks (mid, product, cannot_create_reason, cannot_create_reason_other, updated_by, updated_at)
SELECT DISTINCT ON (mid, product)
  mid,
  product,
  cannot_create_reason,
  cannot_create_reason_other,
  completed_by,
  updated_at
FROM focus_suggestions
WHERE cannot_create_reason IS NOT NULL
ORDER BY mid, product, updated_at DESC
ON CONFLICT (mid, product) DO UPDATE SET
  cannot_create_reason = EXCLUDED.cannot_create_reason,
  cannot_create_reason_other = EXCLUDED.cannot_create_reason_other,
  updated_at = CASE
    WHEN pipeline_remarks.cannot_create_reason IS NULL THEN EXCLUDED.updated_at
    ELSE pipeline_remarks.updated_at
  END;
