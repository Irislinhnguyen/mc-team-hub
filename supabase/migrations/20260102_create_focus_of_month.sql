-- =====================================================
-- FOCUS OF THE MONTH FEATURE
-- =====================================================
-- Creates tables for managing monthly focus lists where managers can
-- generate pipeline suggestions using Query Lab AI and track team progress

-- =====================================================
-- 1. FOCUS METADATA TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.focus_of_month (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Time Period (Month is the primary identifier)
  focus_month INTEGER NOT NULL CHECK (focus_month >= 1 AND focus_month <= 12),
  focus_year INTEGER NOT NULL,

  -- Organization (follows team_configurations structure)
  group_type TEXT NOT NULL CHECK (group_type IN ('sales', 'cs')),
  team_id TEXT REFERENCES public.team_configurations(team_id), -- NULL = all teams

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),

  -- Linking to Query Lab (optional - tracks which sessions generated the suggestions)
  source_session_ids UUID[], -- Array of query_lab_sessions.id

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one focus per month+year+group+team
  CONSTRAINT unique_focus_period UNIQUE (focus_month, focus_year, group_type, COALESCE(team_id, ''))
);

-- =====================================================
-- 2. FOCUS SUGGESTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.focus_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id UUID NOT NULL REFERENCES public.focus_of_month(id) ON DELETE CASCADE,

  -- Core Identifiers (for pipeline matching)
  pid TEXT,
  mid TEXT NOT NULL, -- Required for matching
  product TEXT NOT NULL, -- Required for matching

  -- Display Information (from Query Lab results)
  media_name TEXT,
  publisher_name TEXT,
  pic TEXT,

  -- Metrics (from Query Lab results - for context)
  last_30d_requests BIGINT,
  six_month_avg_requests BIGINT,
  thirty_day_avg_revenue DECIMAL(15,2),

  -- Additional context from Query Lab
  query_lab_data JSONB, -- Store full row from Query Lab for reference

  -- Pipeline Matching Status
  pipeline_created BOOLEAN DEFAULT FALSE,
  matched_pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,

  -- User Actions
  user_status TEXT CHECK (user_status IN ('pending', 'created', 'cannot_create', 'skipped')),
  cannot_create_reason TEXT, -- Dropdown selection: "No traffic", "Publisher declined", etc.
  user_remark TEXT, -- Free text field for notes
  completed_at TIMESTAMPTZ, -- When user checked off
  completed_by UUID REFERENCES auth.users(id),

  -- Sort order (for manual reordering)
  display_order INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: prevent duplicate suggestions in same focus
  CONSTRAINT unique_suggestion_per_focus UNIQUE (focus_id, mid, product)
);

-- =====================================================
-- 3. FOCUS ACTIVITY LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS public.focus_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id UUID NOT NULL REFERENCES public.focus_of_month(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'published', 'archived', 'suggestion_added',
    'suggestion_removed', 'suggestion_completed', 'pipeline_matched'
  )),

  -- Details
  suggestion_id UUID REFERENCES public.focus_suggestions(id) ON DELETE SET NULL,
  details JSONB, -- Flexible field for activity metadata
  notes TEXT,

  -- Audit
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. FOCUS MANAGER ROLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.focus_manager_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES public.team_configurations(team_id), -- NULL = can manage all teams

  -- Permissions
  can_create BOOLEAN DEFAULT TRUE,
  can_publish BOOLEAN DEFAULT TRUE,
  can_delete BOOLEAN DEFAULT FALSE, -- Only admins

  -- Audit
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_team_role UNIQUE (user_id, COALESCE(team_id, ''))
);

-- =====================================================
-- 5. MODIFY PIPELINE IMPACT SNAPSHOTS (if exists)
-- =====================================================
-- This table may or may not exist. If it doesn't, create it.
-- If it does, just add the new column.

CREATE TABLE IF NOT EXISTS public.pipeline_impact_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,

  -- Impact data (same as usePipelineImpact hook)
  publisher TEXT,
  poc TEXT,
  status TEXT,
  slot_type TEXT,
  actual_starting_date TIMESTAMPTZ,
  projected_30d DECIMAL(15,2),
  actual_30d DECIMAL(15,2),
  variance DECIMAL(15,2),
  variance_percent DECIMAL(10,2),
  affected_zones TEXT[],
  affected_zones_count INTEGER,
  pid TEXT,
  mid TEXT,
  granularity TEXT,
  calculated_days INTEGER,
  is_locked BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the new field to link impact to focus suggestions
ALTER TABLE public.pipeline_impact_snapshots
ADD COLUMN IF NOT EXISTS source_focus_suggestion_id UUID REFERENCES public.focus_suggestions(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Focus indexes
CREATE INDEX IF NOT EXISTS idx_focus_status ON public.focus_of_month(status);
CREATE INDEX IF NOT EXISTS idx_focus_period ON public.focus_of_month(focus_year, focus_month);
CREATE INDEX IF NOT EXISTS idx_focus_group ON public.focus_of_month(group_type);
CREATE INDEX IF NOT EXISTS idx_focus_team ON public.focus_of_month(team_id);
CREATE INDEX IF NOT EXISTS idx_focus_created_by ON public.focus_of_month(created_by);

-- Suggestion indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_focus ON public.focus_suggestions(focus_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_pipeline ON public.focus_suggestions(matched_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.focus_suggestions(user_status);
CREATE INDEX IF NOT EXISTS idx_suggestions_mid_product ON public.focus_suggestions(mid, product);
CREATE INDEX IF NOT EXISTS idx_suggestions_completed ON public.focus_suggestions(completed_at) WHERE completed_at IS NOT NULL;

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_focus_activity_focus ON public.focus_activity_log(focus_id);
CREATE INDEX IF NOT EXISTS idx_focus_activity_logged_at ON public.focus_activity_log(logged_at DESC);

-- Manager roles indexes
CREATE INDEX IF NOT EXISTS idx_focus_managers_user ON public.focus_manager_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_managers_team ON public.focus_manager_roles(team_id);

-- Pipeline impact index for focus linkage
CREATE INDEX IF NOT EXISTS idx_pipeline_impact_focus_suggestion
ON public.pipeline_impact_snapshots(source_focus_suggestion_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.focus_of_month ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_manager_roles ENABLE ROW LEVEL SECURITY;

-- ========== Focus of Month Policies ==========

-- Managers can create/edit their team's focuses
CREATE POLICY focus_manager_full_access ON public.focus_of_month
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.focus_manager_roles
      WHERE user_id = auth.uid()
      AND (team_id IS NULL OR team_id = focus_of_month.team_id)
    )
  );

-- All authenticated users can view published focuses
CREATE POLICY focus_published_view ON public.focus_of_month
  FOR SELECT
  USING (status = 'published' OR created_by = auth.uid());

-- ========== Suggestions Policies ==========

-- Suggestions: Inherit from focus (managers can manage, all can view published)
CREATE POLICY suggestions_manager_access ON public.focus_suggestions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.focus_of_month
      WHERE id = focus_suggestions.focus_id
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.focus_manager_roles
          WHERE user_id = auth.uid()
          AND (team_id IS NULL OR team_id = focus_of_month.team_id)
        )
      )
    )
  );

-- All users can view suggestions from published focuses
CREATE POLICY suggestions_published_view ON public.focus_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focus_of_month
      WHERE id = focus_suggestions.focus_id
      AND status = 'published'
    )
  );

-- Team members can update suggestion status (user-related fields only)
CREATE POLICY suggestions_user_update ON public.focus_suggestions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.focus_of_month
      WHERE id = focus_suggestions.focus_id
      AND status = 'published'
    )
  )
  WITH CHECK (
    -- Only allow updating user-related fields
    user_status IS NOT NULL
    OR cannot_create_reason IS NOT NULL
    OR user_remark IS NOT NULL
  );

-- ========== Activity Log Policies ==========

-- Activity log: Read for focus viewers
CREATE POLICY activity_view ON public.focus_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.focus_of_month
      WHERE id = focus_activity_log.focus_id
      AND (status = 'published' OR created_by = auth.uid())
    )
  );

-- Activity log: Anyone can insert (logged_by must match auth.uid())
CREATE POLICY activity_insert ON public.focus_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = logged_by);

-- ========== Manager Roles Policies ==========

-- Manager roles: Only admins can grant/revoke
CREATE POLICY manager_roles_admin ON public.focus_manager_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Manager roles: All authenticated users can see who has manager roles
CREATE POLICY manager_roles_view ON public.focus_manager_roles
  FOR SELECT
  USING (true);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update timestamp trigger for focus_of_month
CREATE TRIGGER update_focus_updated_at
  BEFORE UPDATE ON public.focus_of_month
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for focus_suggestions
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.focus_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== Auto-log focus publication ==========

CREATE OR REPLACE FUNCTION log_focus_publication()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status = 'draft' AND NEW.status = 'published') THEN
    INSERT INTO public.focus_activity_log (focus_id, activity_type, logged_by, details)
    VALUES (
      NEW.id,
      'published',
      NEW.published_by,
      jsonb_build_object('published_at', NEW.published_at)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_log_focus_publication
  AFTER UPDATE ON public.focus_of_month
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_focus_publication();

-- ========== Auto-check pipeline matching ==========

CREATE OR REPLACE FUNCTION check_pipeline_match()
RETURNS TRIGGER AS $$
DECLARE
  matched_pipeline UUID;
  focus_created_date TIMESTAMPTZ;
BEGIN
  -- Get focus created date to only match pipelines created after focus
  SELECT created_at INTO focus_created_date
  FROM public.focus_of_month
  WHERE id = NEW.focus_id;

  -- Check if pipeline exists: (pid + mid + product) OR (mid + product)
  SELECT id INTO matched_pipeline
  FROM public.pipelines
  WHERE (
    -- Priority 1: Match by PID + MID + Product
    (
      NEW.pid IS NOT NULL
      AND pid = NEW.pid
      AND mid = NEW.mid
      AND product LIKE '%' || NEW.product || '%'
    )
    OR
    -- Priority 2: Match by MID + Product only
    (
      mid = NEW.mid
      AND product LIKE '%' || NEW.product || '%'
    )
  )
  AND created_at >= focus_created_date
  ORDER BY
    CASE WHEN pid = NEW.pid THEN 1 ELSE 2 END, -- Prefer PID match
    created_at DESC
  LIMIT 1;

  IF matched_pipeline IS NOT NULL THEN
    NEW.pipeline_created := TRUE;
    NEW.matched_pipeline_id := matched_pipeline;
    NEW.user_status := 'created';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_check_pipeline_match
  BEFORE INSERT OR UPDATE ON public.focus_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION check_pipeline_match();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.focus_of_month IS 'Monthly focus lists created by managers to track pipeline creation goals';
COMMENT ON TABLE public.focus_suggestions IS 'Individual pipeline suggestions from Query Lab AI with tracking status';
COMMENT ON TABLE public.focus_activity_log IS 'Audit trail for all focus-related activities';
COMMENT ON TABLE public.focus_manager_roles IS 'Defines which users can create and manage focuses';

COMMENT ON COLUMN public.focus_of_month.source_session_ids IS 'Links to query_lab_sessions that generated suggestions';
COMMENT ON COLUMN public.focus_suggestions.query_lab_data IS 'Original row from Query Lab for reference';
COMMENT ON COLUMN public.focus_suggestions.matched_pipeline_id IS 'Auto-matched pipeline (trigger-based)';
COMMENT ON COLUMN public.pipeline_impact_snapshots.source_focus_suggestion_id IS 'Links impact to focus suggestion that originated the pipeline';
