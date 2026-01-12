-- ========================================
-- Quarterly Pipeline Workflow Migration
-- ========================================
-- Purpose: Transform from UI-based to Google Sheets-driven quarterly workflow
--
-- Changes:
-- 1. Add key field and quarterly_sheet_id to pipelines table
-- 2. Create quarterly_sheets tracking table
-- 3. Create deleted_pipelines archive table
-- 4. Create indexes for performance
-- 5. Backfill existing pipelines with auto-generated keys
-- ========================================

-- ========================================
-- PHASE 1: Add Columns to Pipelines Table
-- ========================================

ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS key TEXT,
  ADD COLUMN IF NOT EXISTS quarterly_sheet_id UUID;

COMMENT ON COLUMN pipelines.key IS 'Auto-generated key from Google Sheets (Column A formula). Format: POC-YYYY-SEQ. Unique per quarter when combined with proposal_date.';
COMMENT ON COLUMN pipelines.quarterly_sheet_id IS 'References the quarterly sheet this pipeline belongs to';

-- ========================================
-- PHASE 2: Create Quarterly Sheets Table
-- ========================================

CREATE TABLE IF NOT EXISTS quarterly_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quarter identification
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),

  -- Google Sheets info
  spreadsheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  sheet_url TEXT NOT NULL,

  -- Group (sales or cs)
  "group" TEXT NOT NULL CHECK ("group" IN ('sales', 'cs')),

  -- Sync status
  sync_status TEXT NOT NULL DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'archived')),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'partial')),
  last_sync_error TEXT,
  webhook_token TEXT UNIQUE,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one sheet per quarter per group
  CONSTRAINT unique_quarter_group UNIQUE (year, quarter, "group")
);

COMMENT ON TABLE quarterly_sheets IS 'Tracks Google Sheets for each quarter (Q1 2025, Q2 2025, etc.)';
COMMENT ON COLUMN quarterly_sheets.spreadsheet_id IS 'Google Sheets spreadsheet ID extracted from URL';
COMMENT ON COLUMN quarterly_sheets.webhook_token IS 'Unique security token for webhook authentication from Google Apps Script';
COMMENT ON COLUMN quarterly_sheets.sync_status IS 'active: sync enabled, paused: sync disabled, archived: historical sheet';

-- ========================================
-- PHASE 3: Create Deleted Pipelines Archive Table
-- ========================================

CREATE TABLE IF NOT EXISTS deleted_pipelines (
  -- Copy all columns from pipelines table
  id UUID PRIMARY KEY,
  user_id UUID,
  key TEXT,

  -- Metadata
  name TEXT,
  description TEXT,
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  "group" TEXT,
  quarterly_sheet_id UUID,

  -- Basic Info
  classification TEXT,
  poc TEXT,
  team TEXT,
  pid TEXT,
  publisher TEXT,
  mid TEXT,
  medianame TEXT,
  domain TEXT,
  channel TEXT,
  region TEXT,
  product TEXT,
  affected_zones TEXT[],

  -- Revenue Metrics
  imp BIGINT,
  ecpm DECIMAL(10,4),
  max_gross DECIMAL(15,2),
  revenue_share DECIMAL(5,2),
  day_gross DECIMAL(15,2),
  day_net_rev DECIMAL(15,2),
  q_gross DECIMAL(15,2),
  q_net_rev DECIMAL(15,2),

  -- Status & Timeline
  status TEXT,
  progress_percent INTEGER,
  starting_date DATE,
  end_date DATE,
  proposal_date DATE,
  interested_date DATE,
  acceptance_date DATE,
  ready_to_deliver_date DATE,
  actual_starting_date DATE,
  close_won_date DATE,

  -- S- confirmation
  s_confirmation_status TEXT,
  s_confirmed_at TIMESTAMPTZ,
  s_declined_at TIMESTAMPTZ,
  s_confirmation_notes TEXT,

  -- Action Tracking
  action_date DATE,
  next_action TEXT,
  action_detail TEXT,
  action_progress TEXT,

  -- Other
  forecast_type TEXT,
  competitors TEXT,
  metadata JSONB,

  -- Original audit fields
  original_created_at TIMESTAMPTZ,
  original_updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,

  -- Deletion metadata
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID REFERENCES auth.users(id),
  deletion_reason TEXT,
  deletion_source TEXT,
  quarterly_sheet_reference UUID,
  monthly_forecasts_snapshot JSONB
);

COMMENT ON TABLE deleted_pipelines IS 'Archive of deleted pipelines with full historical data';
COMMENT ON COLUMN deleted_pipelines.monthly_forecasts_snapshot IS 'JSONB array of pipeline_monthly_forecast records at time of deletion';
COMMENT ON COLUMN deleted_pipelines.deletion_reason IS 'removed_from_sheet, manual_delete, quarterly_cleanup, etc.';
COMMENT ON COLUMN deleted_pipelines.deletion_source IS 'webhook_sync, api_delete, admin_action, etc.';

-- ========================================
-- PHASE 4: Create Indexes
-- ========================================

-- Unique composite index for (key, proposal_date) - handles NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_key_proposal_date
  ON pipelines (key, COALESCE(proposal_date, '1900-01-01'::date))
  WHERE key IS NOT NULL;

-- Performance indexes for quarterly filtering
CREATE INDEX IF NOT EXISTS idx_pipelines_proposal_date
  ON pipelines (proposal_date)
  WHERE proposal_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipelines_starting_date
  ON pipelines (starting_date)
  WHERE starting_date IS NOT NULL;

-- Composite index for quarterly filtering (proposal_date OR starting_date)
CREATE INDEX IF NOT EXISTS idx_pipelines_quarterly_filter
  ON pipelines (proposal_date, starting_date);

-- Index for quarterly_sheet_id lookup
CREATE INDEX IF NOT EXISTS idx_pipelines_quarterly_sheet_id
  ON pipelines (quarterly_sheet_id)
  WHERE quarterly_sheet_id IS NOT NULL;

-- Quarterly sheets indexes
CREATE INDEX IF NOT EXISTS idx_quarterly_sheets_period
  ON quarterly_sheets (year, quarter);

CREATE INDEX IF NOT EXISTS idx_quarterly_sheets_group
  ON quarterly_sheets ("group");

CREATE INDEX IF NOT EXISTS idx_quarterly_sheets_sync_status
  ON quarterly_sheets (sync_status);

CREATE INDEX IF NOT EXISTS idx_quarterly_sheets_webhook_token
  ON quarterly_sheets (webhook_token)
  WHERE webhook_token IS NOT NULL;

-- Deleted pipelines indexes
CREATE INDEX IF NOT EXISTS idx_deleted_pipelines_deleted_at
  ON deleted_pipelines (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_deleted_pipelines_key
  ON deleted_pipelines (key);

CREATE INDEX IF NOT EXISTS idx_deleted_pipelines_quarterly_sheet
  ON deleted_pipelines (quarterly_sheet_reference);

CREATE INDEX IF NOT EXISTS idx_deleted_pipelines_deletion_reason
  ON deleted_pipelines (deletion_reason);

CREATE INDEX IF NOT EXISTS idx_deleted_pipelines_proposal_date
  ON deleted_pipelines (proposal_date);

-- ========================================
-- PHASE 5: Add Foreign Key Constraint
-- ========================================

ALTER TABLE pipelines
  ADD CONSTRAINT fk_pipelines_quarterly_sheet
  FOREIGN KEY (quarterly_sheet_id)
  REFERENCES quarterly_sheets(id)
  ON DELETE SET NULL;

-- ========================================
-- PHASE 6: Backfill Existing Pipelines
-- ========================================

-- STEP 1: Set proposal_date = created_at for pipelines missing it
UPDATE pipelines
SET proposal_date = created_at::DATE
WHERE proposal_date IS NULL
  AND created_at IS NOT NULL;

-- STEP 2: Auto-generate keys for existing pipelines
-- Format: {POC}-{YYYY}-{SEQ}
WITH numbered_pipelines AS (
  SELECT
    id,
    poc,
    EXTRACT(YEAR FROM COALESCE(proposal_date, created_at))::INTEGER AS year,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(UPPER(SUBSTRING(poc, 1, 3)), 'UNK'),
        EXTRACT(YEAR FROM COALESCE(proposal_date, created_at))
      ORDER BY COALESCE(proposal_date, created_at), created_at
    ) AS seq
  FROM pipelines
  WHERE key IS NULL
)
UPDATE pipelines p
SET key = CONCAT(
  COALESCE(UPPER(SUBSTRING(np.poc, 1, 3)), 'UNK'),
  '-',
  np.year,
  '-',
  LPAD(np.seq::TEXT, 3, '0')
)
FROM numbered_pipelines np
WHERE p.id = np.id;

-- STEP 3: Create legacy quarterly sheets for existing data
-- Auto-create quarterly sheets for all existing quarter/group combinations
INSERT INTO quarterly_sheets (year, quarter, "group", spreadsheet_id, sheet_name, sheet_url, sync_status, webhook_token)
SELECT DISTINCT
  EXTRACT(YEAR FROM p.proposal_date)::INTEGER AS year,
  EXTRACT(QUARTER FROM p.proposal_date)::INTEGER AS quarter,
  p."group",
  'legacy-sheet-' || EXTRACT(YEAR FROM p.proposal_date) || '-Q' || EXTRACT(QUARTER FROM p.proposal_date) || '-' || p."group" AS spreadsheet_id,
  'Legacy_' || UPPER(p."group") || '_Q' || EXTRACT(QUARTER FROM p.proposal_date) || '_' || EXTRACT(YEAR FROM p.proposal_date) AS sheet_name,
  'https://docs.google.com/spreadsheets/legacy' AS sheet_url,
  'archived' AS sync_status,
  NULL AS webhook_token
FROM pipelines p
WHERE p.proposal_date IS NOT NULL
ON CONFLICT (year, quarter, "group") DO NOTHING;

-- STEP 4: Link existing pipelines to their quarterly sheets
UPDATE pipelines p
SET quarterly_sheet_id = qs.id
FROM quarterly_sheets qs
WHERE
  EXTRACT(YEAR FROM p.proposal_date) = qs.year
  AND EXTRACT(QUARTER FROM p.proposal_date) = qs.quarter
  AND p."group" = qs."group"
  AND p.quarterly_sheet_id IS NULL
  AND p.proposal_date IS NOT NULL;

-- ========================================
-- PHASE 7: Enable RLS on New Tables
-- ========================================

ALTER TABLE quarterly_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_pipelines ENABLE ROW LEVEL SECURITY;

-- Quarterly sheets: All authenticated users can read
CREATE POLICY quarterly_sheets_select_policy
  ON quarterly_sheets
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete quarterly sheets
-- (For now, allow all authenticated users - can restrict later)
CREATE POLICY quarterly_sheets_insert_policy
  ON quarterly_sheets
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY quarterly_sheets_update_policy
  ON quarterly_sheets
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY quarterly_sheets_delete_policy
  ON quarterly_sheets
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Deleted pipelines: All authenticated users can read
CREATE POLICY deleted_pipelines_select_policy
  ON deleted_pipelines
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies for deleted_pipelines (system-only)

-- ========================================
-- PHASE 8: Grant Permissions
-- ========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON quarterly_sheets TO authenticated;
GRANT SELECT ON deleted_pipelines TO authenticated;

-- ========================================
-- PHASE 9: Add Triggers
-- ========================================

-- Trigger to update updated_at timestamp on quarterly_sheets
CREATE TRIGGER update_quarterly_sheets_updated_at
  BEFORE UPDATE ON quarterly_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICATION QUERIES (commented out)
-- ========================================

-- Check columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'pipelines'
--   AND column_name IN ('key', 'quarterly_sheet_id')
-- ORDER BY column_name;

-- Check all pipelines have keys
-- SELECT COUNT(*) as total,
--        COUNT(key) as with_key,
--        COUNT(*) - COUNT(key) as missing_key
-- FROM pipelines;

-- Check quarterly sheets created
-- SELECT year, quarter, "group", sync_status, COUNT(*) as pipeline_count
-- FROM quarterly_sheets qs
-- LEFT JOIN pipelines p ON p.quarterly_sheet_id = qs.id
-- GROUP BY year, quarter, "group", sync_status
-- ORDER BY year DESC, quarter DESC;

-- Check unique constraint works
-- SELECT key, proposal_date, COUNT(*) as count
-- FROM pipelines
-- WHERE key IS NOT NULL
-- GROUP BY key, proposal_date
-- HAVING COUNT(*) > 1;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Summary:
-- ✅ Added key and quarterly_sheet_id columns to pipelines
-- ✅ Created quarterly_sheets tracking table
-- ✅ Created deleted_pipelines archive table
-- ✅ Created performance indexes
-- ✅ Backfilled existing pipelines with auto-generated keys
-- ✅ Created legacy quarterly sheets for existing data
-- ✅ Linked existing pipelines to quarterly sheets
-- ✅ Enabled RLS and created policies
-- ✅ Granted permissions to authenticated users
