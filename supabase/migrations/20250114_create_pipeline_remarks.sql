-- Create global remarks table for pipelines
-- Remarks are shared across ALL focuses for the same pipeline (mid+product)

CREATE TABLE IF NOT EXISTS pipeline_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mid TEXT NOT NULL,
  product TEXT NOT NULL,
  remark TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mid, product)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_remarks_lookup ON pipeline_remarks(mid, product);

-- Add comments
COMMENT ON TABLE pipeline_remarks IS 'Global remarks for pipelines (shared across all focuses)';
COMMENT ON COLUMN pipeline_remarks.remark IS 'Shared remark for this pipeline across all focuses - updated in one place, visible everywhere';
