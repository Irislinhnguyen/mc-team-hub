-- Create filter_presets table for storing user-saved filter configurations
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  page TEXT NOT NULL, -- e.g., 'daily-ops', 'deep-dive', 'publisher-summary'
  filters JSONB NOT NULL DEFAULT '{}', -- FilterPanel filter state
  cross_filters JSONB DEFAULT '[]', -- CrossFilter state
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_page_name UNIQUE (user_id, page, name),
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  CONSTRAINT valid_page CHECK (char_length(page) > 0)
);

-- Create filter_preset_shares table for sharing presets with other users
CREATE TABLE IF NOT EXISTS filter_preset_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES filter_presets(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view', -- 'view' or 'edit'
  shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_preset_share UNIQUE (preset_id, shared_with_user_id),
  CONSTRAINT valid_permission CHECK (permission IN ('view', 'edit'))
);

-- Create indexes for better query performance
CREATE INDEX idx_filter_presets_user_page ON filter_presets(user_id, page);
CREATE INDEX idx_filter_presets_user_default ON filter_presets(user_id, page, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_filter_preset_shares_user ON filter_preset_shares(shared_with_user_id);
CREATE INDEX idx_filter_preset_shares_preset ON filter_preset_shares(preset_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_filter_preset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the update function
CREATE TRIGGER trigger_update_filter_preset_timestamp
  BEFORE UPDATE ON filter_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_filter_preset_updated_at();

-- Function to ensure only one default preset per user per page
CREATE OR REPLACE FUNCTION enforce_single_default_preset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    -- Unset any existing default for this user/page combination
    UPDATE filter_presets
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND page = NEW.page
      AND is_default = TRUE
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default
CREATE TRIGGER trigger_enforce_single_default
  BEFORE INSERT OR UPDATE ON filter_presets
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION enforce_single_default_preset();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_preset_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own presets
CREATE POLICY "Users can view own presets"
  ON filter_presets FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view presets shared with them
CREATE POLICY "Users can view shared presets"
  ON filter_presets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM filter_preset_shares
      WHERE filter_preset_shares.preset_id = filter_presets.id
        AND filter_preset_shares.shared_with_user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own presets
CREATE POLICY "Users can create own presets"
  ON filter_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own presets
CREATE POLICY "Users can update own presets"
  ON filter_presets FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can update presets shared with them (if they have edit permission)
CREATE POLICY "Users can update shared presets with edit permission"
  ON filter_presets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM filter_preset_shares
      WHERE filter_preset_shares.preset_id = filter_presets.id
        AND filter_preset_shares.shared_with_user_id = auth.uid()
        AND filter_preset_shares.permission = 'edit'
    )
  );

-- Policy: Users can delete their own presets
CREATE POLICY "Users can delete own presets"
  ON filter_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can view shares for their presets
CREATE POLICY "Users can view shares of own presets"
  ON filter_preset_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM filter_presets
      WHERE filter_presets.id = filter_preset_shares.preset_id
        AND filter_presets.user_id = auth.uid()
    )
  );

-- Policy: Users can view shares where they are the recipient
CREATE POLICY "Users can view their received shares"
  ON filter_preset_shares FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- Policy: Users can create shares for their own presets
CREATE POLICY "Users can share own presets"
  ON filter_preset_shares FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (
      SELECT 1 FROM filter_presets
      WHERE filter_presets.id = filter_preset_shares.preset_id
        AND filter_presets.user_id = auth.uid()
    )
  );

-- Policy: Users can delete shares for their own presets
CREATE POLICY "Users can unshare own presets"
  ON filter_preset_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM filter_presets
      WHERE filter_presets.id = filter_preset_shares.preset_id
        AND filter_presets.user_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON TABLE filter_presets IS 'Stores user-saved filter configurations for analytics pages';
COMMENT ON TABLE filter_preset_shares IS 'Manages sharing of filter presets between users';
COMMENT ON COLUMN filter_presets.filters IS 'JSON object containing FilterPanel filter state (team, pic, product, date range, etc.)';
COMMENT ON COLUMN filter_presets.cross_filters IS 'JSON array containing CrossFilter state for click-based filtering';
COMMENT ON COLUMN filter_presets.is_default IS 'If true, this preset is auto-applied when the page loads';
COMMENT ON COLUMN filter_presets.is_shared IS 'Indicates if this preset has been shared with other users';
