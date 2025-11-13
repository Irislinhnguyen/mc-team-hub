-- ============================================================================
-- SALES LISTS SCHEMA
-- Purpose: Track sales outreach campaigns with activity logging and analytics
-- ============================================================================

-- ============================================================================
-- 1. MAIN LISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#1565C0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_list_name UNIQUE (user_id, name),
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100)
);

COMMENT ON TABLE sales_lists IS 'Sales outreach campaign lists (e.g., "Outreach August", "Q4 Prospects")';
COMMENT ON COLUMN sales_lists.color IS 'Hex color for UI categorization';

-- ============================================================================
-- 2. LIST ITEMS TABLE (contacts/domains in the list)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES sales_lists(id) ON DELETE CASCADE,

  -- Item identification (flexible to support domain_app_id, pid, etc.)
  item_type TEXT NOT NULL,
  item_value TEXT NOT NULL,
  item_label TEXT,

  -- Source tracking
  source TEXT DEFAULT 'manual',

  -- Metadata captured when added
  added_by UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional context (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT unique_list_item UNIQUE (list_id, item_type, item_value),
  CONSTRAINT valid_item_type CHECK (item_type IN ('domain_app_id', 'domain', 'pid', 'mid', 'publisher', 'custom')),
  CONSTRAINT valid_source CHECK (source IN ('gcpp_check', 'manual', 'csv_import'))
);

COMMENT ON TABLE sales_list_items IS 'Items (publishers, apps, domains) added to sales lists';
COMMENT ON COLUMN sales_list_items.item_type IS 'Type of identifier: domain_app_id, domain, pid, mid, publisher, custom';
COMMENT ON COLUMN sales_list_items.item_value IS 'The actual identifier value (e.g., com.example.game, example.com)';
COMMENT ON COLUMN sales_list_items.item_label IS 'Display name (e.g., app name, publisher name)';
COMMENT ON COLUMN sales_list_items.source IS 'How item was added: gcpp_check, manual, csv_import';
COMMENT ON COLUMN sales_list_items.metadata IS 'Additional context: team, partner, product, notes, etc.';

-- ============================================================================
-- 3. ACTIVITY LOGS TABLE (contact attempts, responses, outcomes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_list_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_item_id UUID NOT NULL REFERENCES sales_list_items(id) ON DELETE CASCADE,

  -- Activity type
  activity_type TEXT NOT NULL,

  -- Timestamps
  contact_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time TIMESTAMPTZ,

  -- Outcomes
  contact_outcome TEXT,
  response_outcome TEXT,
  closed_status TEXT,

  -- Deal information
  deal_value DECIMAL(10,2),

  -- Activity details
  notes TEXT,

  -- Tracking
  logged_by UUID NOT NULL REFERENCES users(id),
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Constraints
  CONSTRAINT valid_activity_type CHECK (activity_type IN ('contact', 'response', 'note')),
  CONSTRAINT valid_contact_outcome CHECK (contact_outcome IN ('contacted', 'retarget', 'follow_up') OR contact_outcome IS NULL),
  CONSTRAINT valid_response_outcome CHECK (response_outcome IN ('positive', 'negative', 'neutral') OR response_outcome IS NULL),
  CONSTRAINT valid_closed_status CHECK (closed_status IN ('closed_won', 'closed_lost') OR closed_status IS NULL)
);

COMMENT ON TABLE sales_list_activities IS 'Activity log for each list item (contacts, responses, outcomes)';
COMMENT ON COLUMN sales_list_activities.activity_type IS 'Type: contact (outreach), response (customer replied), note (general note)';
COMMENT ON COLUMN sales_list_activities.contact_time IS 'When contact was made (default NOW, editable)';
COMMENT ON COLUMN sales_list_activities.response_time IS 'When response received (nullable, editable)';
COMMENT ON COLUMN sales_list_activities.contact_outcome IS 'Type of contact: contacted (initial), retarget, follow_up';
COMMENT ON COLUMN sales_list_activities.response_outcome IS 'Customer response: positive, negative, neutral';
COMMENT ON COLUMN sales_list_activities.closed_status IS 'Deal status: closed_won, closed_lost (final state)';
COMMENT ON COLUMN sales_list_activities.deal_value IS 'Deal amount for closed_won (optional)';
COMMENT ON COLUMN sales_list_activities.notes IS 'Free-form notes (optional)';

-- ============================================================================
-- 4. LIST SHARING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_list_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES sales_lists(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_list_share UNIQUE (list_id, shared_with_user_id),
  CONSTRAINT valid_permission CHECK (permission IN ('view', 'edit'))
);

COMMENT ON TABLE sales_list_shares IS 'List sharing permissions (like filter_preset_shares)';
COMMENT ON COLUMN sales_list_shares.permission IS 'Access level: view (read-only) or edit (full access)';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_sales_lists_user_id ON sales_lists(user_id);
CREATE INDEX idx_sales_lists_updated_at ON sales_lists(updated_at DESC);

CREATE INDEX idx_sales_list_items_list_id ON sales_list_items(list_id);
CREATE INDEX idx_sales_list_items_item_type_value ON sales_list_items(item_type, item_value);
CREATE INDEX idx_sales_list_items_source ON sales_list_items(source);

CREATE INDEX idx_sales_list_activities_list_item_id ON sales_list_activities(list_item_id);
CREATE INDEX idx_sales_list_activities_contact_time ON sales_list_activities(contact_time DESC);
CREATE INDEX idx_sales_list_activities_logged_by ON sales_list_activities(logged_by);
CREATE INDEX idx_sales_list_activities_contact_outcome ON sales_list_activities(contact_outcome) WHERE contact_outcome IS NOT NULL;
CREATE INDEX idx_sales_list_activities_response_outcome ON sales_list_activities(response_outcome) WHERE response_outcome IS NOT NULL;
CREATE INDEX idx_sales_list_activities_closed_status ON sales_list_activities(closed_status) WHERE closed_status IS NOT NULL;

CREATE INDEX idx_sales_list_shares_shared_with ON sales_list_shares(shared_with_user_id);
CREATE INDEX idx_sales_list_shares_list_id ON sales_list_shares(list_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp on sales_lists
CREATE TRIGGER update_sales_lists_updated_at
  BEFORE UPDATE ON sales_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE sales_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_list_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_list_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SALES_LISTS POLICIES
-- ============================================================================

-- Users can view their own lists
CREATE POLICY "Users can view own lists"
  ON sales_lists FOR SELECT
  USING (user_id = auth.uid());

-- Users can view shared lists
CREATE POLICY "Users can view shared lists"
  ON sales_lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales_list_shares
      WHERE sales_list_shares.list_id = sales_lists.id
        AND sales_list_shares.shared_with_user_id = auth.uid()
    )
  );

-- Users can create lists (owned by them)
CREATE POLICY "Users can create lists"
  ON sales_lists FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own lists
CREATE POLICY "Users can update own lists"
  ON sales_lists FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own lists
CREATE POLICY "Users can delete own lists"
  ON sales_lists FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- SALES_LIST_ITEMS POLICIES
-- ============================================================================

-- Users can view items in lists they have access to
CREATE POLICY "Users can view list items"
  ON sales_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_items.list_id
        AND (
          sales_lists.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sales_list_shares
            WHERE sales_list_shares.list_id = sales_lists.id
              AND sales_list_shares.shared_with_user_id = auth.uid()
          )
        )
    )
  );

-- Users can add items to their own lists or shared lists with edit permission
CREATE POLICY "Users can insert list items"
  ON sales_list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_items.list_id
        AND (
          sales_lists.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sales_list_shares
            WHERE sales_list_shares.list_id = sales_lists.id
              AND sales_list_shares.shared_with_user_id = auth.uid()
              AND sales_list_shares.permission = 'edit'
          )
        )
    )
  );

-- Users can delete items from their own lists or shared lists with edit permission
CREATE POLICY "Users can delete list items"
  ON sales_list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_items.list_id
        AND (
          sales_lists.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sales_list_shares
            WHERE sales_list_shares.list_id = sales_lists.id
              AND sales_list_shares.shared_with_user_id = auth.uid()
              AND sales_list_shares.permission = 'edit'
          )
        )
    )
  );

-- ============================================================================
-- SALES_LIST_ACTIVITIES POLICIES
-- ============================================================================

-- Users can view activities for items they have access to
CREATE POLICY "Users can view activities"
  ON sales_list_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales_list_items
      JOIN sales_lists ON sales_lists.id = sales_list_items.list_id
      WHERE sales_list_items.id = sales_list_activities.list_item_id
        AND (
          sales_lists.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sales_list_shares
            WHERE sales_list_shares.list_id = sales_lists.id
              AND sales_list_shares.shared_with_user_id = auth.uid()
          )
        )
    )
  );

-- Users can log activities for items in their own lists or shared lists with edit permission
CREATE POLICY "Users can insert activities"
  ON sales_list_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_list_items
      JOIN sales_lists ON sales_lists.id = sales_list_items.list_id
      WHERE sales_list_items.id = sales_list_activities.list_item_id
        AND (
          sales_lists.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sales_list_shares
            WHERE sales_list_shares.list_id = sales_lists.id
              AND sales_list_shares.shared_with_user_id = auth.uid()
              AND sales_list_shares.permission = 'edit'
          )
        )
    )
  );

-- Users can update their own activity logs
CREATE POLICY "Users can update activities"
  ON sales_list_activities FOR UPDATE
  USING (
    logged_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sales_list_items
      JOIN sales_lists ON sales_lists.id = sales_list_items.list_id
      WHERE sales_list_items.id = sales_list_activities.list_item_id
        AND (
          sales_lists.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sales_list_shares
            WHERE sales_list_shares.list_id = sales_lists.id
              AND sales_list_shares.shared_with_user_id = auth.uid()
              AND sales_list_shares.permission = 'edit'
          )
        )
    )
  )
  WITH CHECK (logged_by = auth.uid());

-- Users can delete their own activity logs
CREATE POLICY "Users can delete activities"
  ON sales_list_activities FOR DELETE
  USING (
    logged_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sales_list_items
      JOIN sales_lists ON sales_lists.id = sales_list_items.list_id
      WHERE sales_list_items.id = sales_list_activities.list_item_id
        AND (
          sales_lists.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sales_list_shares
            WHERE sales_list_shares.list_id = sales_lists.id
              AND sales_list_shares.shared_with_user_id = auth.uid()
              AND sales_list_shares.permission = 'edit'
          )
        )
    )
  );

-- ============================================================================
-- SALES_LIST_SHARES POLICIES
-- ============================================================================

-- Users can view shares for their own lists
CREATE POLICY "Users can view list shares"
  ON sales_list_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_shares.list_id
        AND sales_lists.user_id = auth.uid()
    )
    OR shared_with_user_id = auth.uid()
  );

-- Users can share their own lists
CREATE POLICY "Users can create shares"
  ON sales_list_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_shares.list_id
        AND sales_lists.user_id = auth.uid()
    )
    AND shared_by_user_id = auth.uid()
  );

-- Users can update shares for their own lists
CREATE POLICY "Users can update shares"
  ON sales_list_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_shares.list_id
        AND sales_lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_shares.list_id
        AND sales_lists.user_id = auth.uid()
    )
  );

-- Users can delete shares for their own lists
CREATE POLICY "Users can delete shares"
  ON sales_list_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sales_lists
      WHERE sales_lists.id = sales_list_shares.list_id
        AND sales_lists.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SUMMARY VIEW FOR LIST ITEMS (Auto-calculated current status)
-- ============================================================================

CREATE OR REPLACE VIEW sales_list_items_summary AS
SELECT
  sli.id,
  sli.list_id,
  sli.item_type,
  sli.item_value,
  sli.item_label,
  sli.source,
  sli.added_by,
  sli.added_at,
  sli.metadata,

  -- Latest outcome (for status badge)
  (
    SELECT COALESCE(closed_status, response_outcome, 'contacted')
    FROM sales_list_activities
    WHERE list_item_id = sli.id
    ORDER BY
      CASE WHEN closed_status IS NOT NULL THEN contact_time END DESC NULLS LAST,
      CASE WHEN response_outcome IS NOT NULL THEN response_time END DESC NULLS LAST,
      contact_time DESC
    LIMIT 1
  ) as current_status,

  -- Latest contact type
  (
    SELECT contact_outcome
    FROM sales_list_activities
    WHERE list_item_id = sli.id AND activity_type = 'contact'
    ORDER BY contact_time DESC LIMIT 1
  ) as latest_contact_type,

  -- Contact counts
  (
    SELECT COUNT(*)::INTEGER
    FROM sales_list_activities
    WHERE list_item_id = sli.id AND activity_type = 'contact'
  ) as total_contacts,

  (
    SELECT COUNT(*)::INTEGER
    FROM sales_list_activities
    WHERE list_item_id = sli.id
      AND activity_type = 'contact'
      AND contact_outcome = 'retarget'
  ) as retarget_count,

  -- Response counts
  (
    SELECT COUNT(*)::INTEGER
    FROM sales_list_activities
    WHERE list_item_id = sli.id AND response_outcome = 'positive'
  ) as positive_count,

  (
    SELECT COUNT(*)::INTEGER
    FROM sales_list_activities
    WHERE list_item_id = sli.id AND response_outcome = 'negative'
  ) as negative_count,

  -- Latest timestamps
  (
    SELECT MAX(contact_time)
    FROM sales_list_activities
    WHERE list_item_id = sli.id
  ) as last_contact_at,

  (
    SELECT MAX(response_time)
    FROM sales_list_activities
    WHERE list_item_id = sli.id AND response_time IS NOT NULL
  ) as last_response_at,

  -- Latest activity user
  (
    SELECT u.email
    FROM sales_list_activities sla
    JOIN users u ON u.id = sla.logged_by
    WHERE sla.list_item_id = sli.id
    ORDER BY sla.contact_time DESC LIMIT 1
  ) as last_activity_by,

  -- Deal value
  (
    SELECT deal_value
    FROM sales_list_activities
    WHERE list_item_id = sli.id AND closed_status = 'closed_won'
    ORDER BY contact_time DESC LIMIT 1
  ) as deal_value,

  -- Successful retargets
  (
    SELECT COUNT(*)::INTEGER
    FROM sales_list_activities
    WHERE list_item_id = sli.id
      AND contact_outcome = 'retarget'
      AND response_outcome = 'positive'
  ) as successful_retargets

FROM sales_list_items sli;

COMMENT ON VIEW sales_list_items_summary IS 'Enriched view of list items with auto-calculated current status, counts, and latest activity';

-- Grant RLS bypass for view (inherits policies from underlying tables)
ALTER VIEW sales_list_items_summary SET (security_invoker = true);
