-- =====================================================
-- Pipeline Data Model Refactoring
-- Converts container-based to flat architecture
-- Each pipeline row = 1 opportunity (not container + deals)
-- =====================================================

-- ========================================
-- PHASE 1: Drop Old Schema
-- ========================================

DROP VIEW IF EXISTS pipeline_deals_summary CASCADE;
DROP TABLE IF EXISTS deal_activity_log CASCADE;
DROP TABLE IF EXISTS deal_monthly_forecast CASCADE;
DROP TABLE IF EXISTS pipeline_deals CASCADE;
DROP TABLE IF EXISTS pipelines CASCADE;

-- Keep pipeline_stages reference table (unchanged)

-- ========================================
-- PHASE 2: Create New Pipelines Table
-- ========================================

CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata (organizational fields)
  name TEXT NOT NULL,
  description TEXT,
  fiscal_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  fiscal_quarter INTEGER CHECK (fiscal_quarter >= 1 AND fiscal_quarter <= 4),
  "group" VARCHAR(50) NOT NULL DEFAULT 'sales' CHECK ("group" IN ('sales', 'cs')),

  -- ===== MERGED FROM pipeline_deals =====

  -- Basic Info (9 fields)
  classification TEXT,
  poc TEXT NOT NULL,
  team TEXT,
  pid TEXT,
  publisher TEXT NOT NULL,
  domain TEXT,
  channel TEXT,
  region TEXT,
  product TEXT,

  -- Revenue Metrics (6 fields)
  day_gross DECIMAL(15,2),
  day_net_rev DECIMAL(15,2),
  imp BIGINT,
  ecpm DECIMAL(10,4),
  max_gross DECIMAL(15,2),
  revenue_share DECIMAL(5,2),

  -- Status & Timeline (6 fields)
  status TEXT NOT NULL DEFAULT '【E】' REFERENCES pipeline_stages(code),
  progress_percent INTEGER CHECK (progress_percent >= 0 AND progress_percent <= 100),
  starting_date DATE,
  proposal_date DATE,
  interested_date DATE,
  acceptance_date DATE,

  -- Action Tracking (4 fields)
  action_date DATE,
  next_action TEXT,
  action_detail TEXT,
  action_progress TEXT,

  -- Quarter Summary (2 fields)
  q_gross DECIMAL(15,2),
  q_net_rev DECIMAL(15,2),

  -- Forecast Type (1 field)
  forecast_type TEXT NOT NULL DEFAULT 'estimate' CHECK (forecast_type IN ('estimate', 'out_of_estimate')),

  -- Other (2 fields)
  competitors TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit (4 fields)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE pipelines IS 'Sales pipelines - each row represents one opportunity/publisher deal';
COMMENT ON COLUMN pipelines."group" IS 'Pipeline group: sales or cs. Each POC can have multiple pipelines.';
COMMENT ON COLUMN pipelines.publisher IS 'Publisher name (primary identifier for the opportunity)';
COMMENT ON COLUMN pipelines.name IS 'Pipeline name (auto-generated from publisher if not provided)';

-- ========================================
-- PHASE 3: Create Forecast Table (Renamed)
-- ========================================

CREATE TABLE pipeline_monthly_forecast (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,

  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  gross_revenue DECIMAL(15,2),
  net_revenue DECIMAL(15,2),

  end_date DATE,
  delivery_days INTEGER,
  validation_flag BOOLEAN DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_pipeline_month UNIQUE (pipeline_id, year, month)
);

COMMENT ON TABLE pipeline_monthly_forecast IS 'Monthly revenue forecast per pipeline';
COMMENT ON COLUMN pipeline_monthly_forecast.pipeline_id IS 'References pipelines table (was deal_id)';

-- ========================================
-- PHASE 4: Create Activity Log Table (Renamed)
-- ========================================

CREATE TABLE pipeline_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL CHECK (activity_type IN ('status_change', 'note', 'action_update', 'forecast_update', 'field_update')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,

  logged_by UUID NOT NULL REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pipeline_activity_log IS 'Activity and change history for pipelines';
COMMENT ON COLUMN pipeline_activity_log.pipeline_id IS 'References pipelines table (was deal_id)';

-- ========================================
-- PHASE 5: Create Indexes
-- ========================================

-- Pipelines indexes
CREATE INDEX idx_pipelines_user ON pipelines(user_id);
CREATE INDEX idx_pipelines_group ON pipelines("group");
CREATE INDEX idx_pipelines_status ON pipelines(status);
CREATE INDEX idx_pipelines_poc ON pipelines(poc);
CREATE INDEX idx_pipelines_team ON pipelines(team);
CREATE INDEX idx_pipelines_publisher ON pipelines(publisher);
CREATE INDEX idx_pipelines_forecast_type ON pipelines(forecast_type);
CREATE INDEX idx_pipelines_created_at ON pipelines(created_at DESC);

-- Forecast indexes
CREATE INDEX idx_pipeline_monthly_forecast_pipeline ON pipeline_monthly_forecast(pipeline_id);
CREATE INDEX idx_pipeline_monthly_forecast_period ON pipeline_monthly_forecast(year, month);

-- Activity log indexes
CREATE INDEX idx_pipeline_activity_pipeline ON pipeline_activity_log(pipeline_id);
CREATE INDEX idx_pipeline_activity_logged_at ON pipeline_activity_log(logged_at DESC);
CREATE INDEX idx_pipeline_activity_logged_by ON pipeline_activity_log(logged_by);

-- ========================================
-- PHASE 6: Create Summary View
-- ========================================

CREATE OR REPLACE VIEW pipelines_summary AS
SELECT
  p.*,

  -- Aggregated forecast totals
  COALESCE((SELECT SUM(gross_revenue) FROM pipeline_monthly_forecast WHERE pipeline_id = p.id), 0) as total_forecast_gross,
  COALESCE((SELECT SUM(net_revenue) FROM pipeline_monthly_forecast WHERE pipeline_id = p.id), 0) as total_forecast_net,

  -- Status information from pipeline_stages
  ps.name as status_name,
  ps.description as status_description,
  ps.estimate_percent,
  ps.out_of_estimate_percent,
  ps.color as status_color,
  ps.sort_order as status_sort_order,

  -- Activity information
  (SELECT COUNT(*)::INTEGER FROM pipeline_activity_log WHERE pipeline_id = p.id) as activity_count,
  (SELECT logged_at FROM pipeline_activity_log WHERE pipeline_id = p.id ORDER BY logged_at DESC LIMIT 1) as last_activity_at,

  -- Days in current status
  CASE
    WHEN p.updated_at IS NOT NULL THEN EXTRACT(DAY FROM NOW() - p.updated_at)::INTEGER
    ELSE 0
  END as days_in_status

FROM pipelines p
LEFT JOIN pipeline_stages ps ON ps.code = p.status;

COMMENT ON VIEW pipelines_summary IS 'Enriched pipeline view with calculated fields and joins';

ALTER VIEW pipelines_summary SET (security_invoker = true);

-- ========================================
-- PHASE 7: Create Triggers
-- ========================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_monthly_forecast_updated_at
  BEFORE UPDATE ON pipeline_monthly_forecast
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically log status changes
CREATE OR REPLACE FUNCTION log_pipeline_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO pipeline_activity_log (
      pipeline_id,
      activity_type,
      field_changed,
      old_value,
      new_value,
      logged_by
    )
    VALUES (
      NEW.id,
      'status_change',
      'status',
      OLD.status,
      NEW.status,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_log_pipeline_status_change
  AFTER UPDATE ON pipelines
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_pipeline_activity();

-- ========================================
-- PHASE 8: Enable Row Level Security
-- ========================================

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_monthly_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_activity_log ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PHASE 9: Create RLS Policies - Pipelines
-- ========================================

CREATE POLICY pipelines_select_policy
  ON pipelines
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY pipelines_insert_policy
  ON pipelines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY pipelines_update_policy
  ON pipelines
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY pipelines_delete_policy
  ON pipelines
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- PHASE 10: Create RLS Policies - Forecast
-- ========================================

CREATE POLICY forecast_select_policy
  ON pipeline_monthly_forecast
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE id = pipeline_monthly_forecast.pipeline_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY forecast_insert_policy
  ON pipeline_monthly_forecast
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE id = pipeline_monthly_forecast.pipeline_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY forecast_update_policy
  ON pipeline_monthly_forecast
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE id = pipeline_monthly_forecast.pipeline_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY forecast_delete_policy
  ON pipeline_monthly_forecast
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE id = pipeline_monthly_forecast.pipeline_id
        AND user_id = auth.uid()
    )
  );

-- ========================================
-- PHASE 11: Create RLS Policies - Activity Log
-- ========================================

CREATE POLICY activity_select_policy
  ON pipeline_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE id = pipeline_activity_log.pipeline_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY activity_insert_policy
  ON pipeline_activity_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE id = pipeline_activity_log.pipeline_id
        AND user_id = auth.uid()
    )
    AND auth.uid() = logged_by
  );

-- No UPDATE/DELETE policies for activity log (immutable audit trail)

-- ========================================
-- PHASE 12: Grant Permissions
-- ========================================

GRANT ALL ON pipelines TO authenticated;
GRANT ALL ON pipeline_monthly_forecast TO authenticated;
GRANT ALL ON pipeline_activity_log TO authenticated;
GRANT SELECT ON pipelines_summary TO authenticated;

-- ========================================
-- Migration Complete
-- ========================================

-- Summary:
-- - Dropped: pipelines (container), pipeline_deals, deal_monthly_forecast, deal_activity_log
-- - Created: pipelines (merged), pipeline_monthly_forecast, pipeline_activity_log
-- - Result: Flat architecture where each pipeline = 1 opportunity
