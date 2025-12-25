-- Pipeline Management System
-- Replaces Google Sheets workflow for sales pipeline tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: pipelines (Container for deals)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fiscal_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  fiscal_quarter INTEGER CHECK (fiscal_quarter >= 1 AND fiscal_quarter <= 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_pipeline_name UNIQUE (user_id, name)
);

COMMENT ON TABLE pipelines IS 'Sales pipeline containers (e.g., Q1 2025 SEA, India FY2025)';
COMMENT ON COLUMN pipelines.fiscal_quarter IS 'Quarter (1-4), null = full year view';

-- =====================================================
-- TABLE: pipeline_stages (Reference data for stages)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  estimate_percent INTEGER NOT NULL DEFAULT 0 CHECK (estimate_percent >= 0 AND estimate_percent <= 100),
  out_of_estimate_percent INTEGER NOT NULL DEFAULT 0 CHECK (out_of_estimate_percent >= 0 AND out_of_estimate_percent <= 100),
  sort_order INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pipeline_stages IS 'Pipeline stage definitions from spreadsheet Status tab';
COMMENT ON COLUMN pipeline_stages.estimate_percent IS 'First percentage (conservative forecast)';
COMMENT ON COLUMN pipeline_stages.out_of_estimate_percent IS 'Second percentage (optimistic forecast)';

-- Seed pipeline stages from spreadsheet
INSERT INTO pipeline_stages (code, name, description, estimate_percent, out_of_estimate_percent, sort_order, color) VALUES
('【S】', 'Repeat reflected', 'Repeat reflected', 0, 0, 1, '#10B981'),
('【S-】', 'Distribution started', 'Distribution started but not reflected in Repeat', 100, 0, 2, '#059669'),
('【A】', 'Tags sent', 'Tags sent (Distribution start date confirmed)', 80, 20, 3, '#3B82F6'),
('【B】', 'Agreement obtained', 'Client agreement obtained (Agreement on distribution start timeline confirmed)', 60, 40, 4, '#6366F1'),
('【C+】', 'Agreement, timeline undecided', 'Client agreement obtained (Distribution start timeline undecided)', 50, 50, 5, '#8B5CF6'),
('【C】', 'Positively considering', 'Positively considering based on field representative', 30, 70, 6, '#A78BFA'),
('【C-】', 'Proposal submitted', 'Proposal submitted (Client in consideration stage; low likelihood)', 5, 95, 7, '#F59E0B'),
('【D】', 'Before proposal', 'Before proposal / Medium ~ High certainty measures', 100, 100, 8, '#F97316'),
('【E】', 'Low certainty', 'Low certainty measures', 0, 50, 9, '#EF4444')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- TABLE: pipeline_deals (Core deal data - 35 columns)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,

  -- Basic Info (9 fields from spreadsheet)
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

  -- Status & Timeline (7 fields)
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

  -- Forecast Type (Critical for reporting)
  forecast_type TEXT NOT NULL DEFAULT 'estimate' CHECK (forecast_type IN ('estimate', 'out_of_estimate')),

  -- Competitors
  competitors TEXT,

  -- Flexible metadata for future fields (JSONB)
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE pipeline_deals IS 'Sales deals/opportunities (normalized from 99-column spreadsheet)';
COMMENT ON COLUMN pipeline_deals.poc IS 'Point of Contact (Zenny, Febri, Safitri)';
COMMENT ON COLUMN pipeline_deals.team IS 'Market team (SEA, India)';
COMMENT ON COLUMN pipeline_deals.forecast_type IS 'estimate = conservative, out_of_estimate = optimistic';
COMMENT ON COLUMN pipeline_deals.metadata IS 'Flexible JSONB for additional fields without schema changes';

-- Indexes for performance
CREATE INDEX idx_pipeline_deals_pipeline ON pipeline_deals(pipeline_id);
CREATE INDEX idx_pipeline_deals_status ON pipeline_deals(status);
CREATE INDEX idx_pipeline_deals_poc ON pipeline_deals(poc);
CREATE INDEX idx_pipeline_deals_team ON pipeline_deals(team);
CREATE INDEX idx_pipeline_deals_forecast_type ON pipeline_deals(forecast_type);
CREATE INDEX idx_pipeline_deals_created_at ON pipeline_deals(created_at DESC);
CREATE INDEX idx_pipeline_deals_publisher ON pipeline_deals(publisher);

-- =====================================================
-- TABLE: deal_monthly_forecast (Monthly revenue breakdown)
-- =====================================================
CREATE TABLE IF NOT EXISTS deal_monthly_forecast (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES pipeline_deals(id) ON DELETE CASCADE,

  -- Month identifier
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Monthly Revenue
  gross_revenue DECIMAL(15,2),
  net_revenue DECIMAL(15,2),

  -- Monthly Status (from spreadsheet columns)
  end_date DATE,
  delivery_days INTEGER,
  validation_flag BOOLEAN DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_deal_month UNIQUE (deal_id, year, month)
);

COMMENT ON TABLE deal_monthly_forecast IS 'Monthly revenue forecast breakdown (replaces 24+ monthly columns in spreadsheet)';
COMMENT ON COLUMN deal_monthly_forecast.validation_flag IS 'Boolean check from spreadsheet 判定 columns';

CREATE INDEX idx_deal_monthly_forecast_deal ON deal_monthly_forecast(deal_id);
CREATE INDEX idx_deal_monthly_forecast_period ON deal_monthly_forecast(year, month);

-- =====================================================
-- TABLE: deal_activity_log (Audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS deal_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES pipeline_deals(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,

  logged_by UUID NOT NULL REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE deal_activity_log IS 'Activity and change history for deals';
COMMENT ON COLUMN deal_activity_log.activity_type IS 'status_change, note, action_update, forecast_update, etc.';

CREATE INDEX idx_deal_activity_deal ON deal_activity_log(deal_id);
CREATE INDEX idx_deal_activity_logged_at ON deal_activity_log(logged_at DESC);
CREATE INDEX idx_deal_activity_logged_by ON deal_activity_log(logged_by);

-- =====================================================
-- VIEW: pipeline_deals_summary (Performance optimization)
-- =====================================================
CREATE OR REPLACE VIEW pipeline_deals_summary AS
SELECT
  pd.*,

  -- Auto-calculated monthly forecast totals
  COALESCE((
    SELECT SUM(gross_revenue)
    FROM deal_monthly_forecast
    WHERE deal_id = pd.id
  ), 0) as total_forecast_gross,

  COALESCE((
    SELECT SUM(net_revenue)
    FROM deal_monthly_forecast
    WHERE deal_id = pd.id
  ), 0) as total_forecast_net,

  -- Stage info (join with pipeline_stages)
  ps.name as status_name,
  ps.description as status_description,
  ps.estimate_percent,
  ps.out_of_estimate_percent,
  ps.color as status_color,
  ps.sort_order as status_sort_order,

  -- Activity count
  (
    SELECT COUNT(*)::INTEGER
    FROM deal_activity_log
    WHERE deal_id = pd.id
  ) as activity_count,

  -- Latest activity timestamp
  (
    SELECT logged_at
    FROM deal_activity_log
    WHERE deal_id = pd.id
    ORDER BY logged_at DESC
    LIMIT 1
  ) as last_activity_at,

  -- Days in current status (calculated)
  CASE
    WHEN pd.updated_at IS NOT NULL
    THEN EXTRACT(DAY FROM NOW() - pd.updated_at)::INTEGER
    ELSE 0
  END as days_in_status

FROM pipeline_deals pd
LEFT JOIN pipeline_stages ps ON ps.code = pd.status;

COMMENT ON VIEW pipeline_deals_summary IS 'Enriched deal view with calculated fields for performance';

-- Set security invoker for RLS
ALTER VIEW pipeline_deals_summary SET (security_invoker = true);

-- =====================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_deals_updated_at
  BEFORE UPDATE ON pipeline_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_monthly_forecast_updated_at
  BEFORE UPDATE ON deal_monthly_forecast
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_monthly_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activity_log ENABLE ROW LEVEL SECURITY;

-- Pipelines: Users can only see their own pipelines
CREATE POLICY pipelines_select_policy ON pipelines
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY pipelines_insert_policy ON pipelines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY pipelines_update_policy ON pipelines
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY pipelines_delete_policy ON pipelines
  FOR DELETE
  USING (auth.uid() = user_id);

-- Deals: Users can access deals in their pipelines
CREATE POLICY deals_select_policy ON pipeline_deals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_deals.pipeline_id
        AND pipelines.user_id = auth.uid()
    )
  );

CREATE POLICY deals_insert_policy ON pipeline_deals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_deals.pipeline_id
        AND pipelines.user_id = auth.uid()
    )
  );

CREATE POLICY deals_update_policy ON pipeline_deals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_deals.pipeline_id
        AND pipelines.user_id = auth.uid()
    )
  );

CREATE POLICY deals_delete_policy ON pipeline_deals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_deals.pipeline_id
        AND pipelines.user_id = auth.uid()
    )
  );

-- Monthly forecast: Inherit from deals
CREATE POLICY forecast_select_policy ON deal_monthly_forecast
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_deals pd
      JOIN pipelines p ON p.id = pd.pipeline_id
      WHERE pd.id = deal_monthly_forecast.deal_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY forecast_insert_policy ON deal_monthly_forecast
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipeline_deals pd
      JOIN pipelines p ON p.id = pd.pipeline_id
      WHERE pd.id = deal_monthly_forecast.deal_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY forecast_update_policy ON deal_monthly_forecast
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_deals pd
      JOIN pipelines p ON p.id = pd.pipeline_id
      WHERE pd.id = deal_monthly_forecast.deal_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY forecast_delete_policy ON deal_monthly_forecast
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_deals pd
      JOIN pipelines p ON p.id = pd.pipeline_id
      WHERE pd.id = deal_monthly_forecast.deal_id
        AND p.user_id = auth.uid()
    )
  );

-- Activity log: Inherit from deals
CREATE POLICY activity_select_policy ON deal_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_deals pd
      JOIN pipelines p ON p.id = pd.pipeline_id
      WHERE pd.id = deal_activity_log.deal_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY activity_insert_policy ON deal_activity_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipeline_deals pd
      JOIN pipelines p ON p.id = pd.pipeline_id
      WHERE pd.id = deal_activity_log.deal_id
        AND p.user_id = auth.uid()
    )
    AND auth.uid() = logged_by
  );

-- Pipeline stages: Public read-only (reference data)
CREATE POLICY stages_select_policy ON pipeline_stages
  FOR SELECT
  USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to log deal activity automatically
CREATE OR REPLACE FUNCTION log_deal_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO deal_activity_log (
      deal_id,
      activity_type,
      field_changed,
      old_value,
      new_value,
      logged_by
    ) VALUES (
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

CREATE TRIGGER auto_log_deal_status_change
  AFTER UPDATE ON pipeline_deals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_deal_activity();

-- =====================================================
-- GRANTS (for authenticated users)
-- =====================================================
GRANT SELECT ON pipeline_stages TO authenticated;
GRANT ALL ON pipelines TO authenticated;
GRANT ALL ON pipeline_deals TO authenticated;
GRANT ALL ON deal_monthly_forecast TO authenticated;
GRANT ALL ON deal_activity_log TO authenticated;
GRANT SELECT ON pipeline_deals_summary TO authenticated;
