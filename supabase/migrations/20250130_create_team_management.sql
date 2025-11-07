-- Team Management Tables
-- This migration creates tables for managing team configurations and PIC assignments

-- 1. Team Configurations Table
CREATE TABLE IF NOT EXISTS public.team_configurations (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Team PIC Mappings Table
CREATE TABLE IF NOT EXISTS public.team_pic_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL REFERENCES public.team_configurations(team_id) ON DELETE CASCADE,
  pic_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(pic_name) -- Each PIC can only belong to one team
);

-- 3. Team Product Patterns Table (fallback for unassigned PICs)
CREATE TABLE IF NOT EXISTS public.team_product_patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL REFERENCES public.team_configurations(team_id) ON DELETE CASCADE,
  product_pattern TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'LIKE', -- 'LIKE', 'EQUALS', 'STARTS_WITH'
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_team_pic_mappings_team_id ON public.team_pic_mappings(team_id);
CREATE INDEX idx_team_pic_mappings_pic_name ON public.team_pic_mappings(pic_name);
CREATE INDEX idx_team_product_patterns_team_id ON public.team_product_patterns(team_id);

-- Insert default team configurations
INSERT INTO public.team_configurations (team_id, team_name, description, display_order) VALUES
  ('WEB_GTI', 'Web GTI', 'Indonesia Web Team', 1),
  ('WEB_GV', 'Web GV', 'Vietnam Web Team', 2),
  ('APP', 'App', 'Mobile App Team', 3)
ON CONFLICT (team_id) DO NOTHING;

-- Insert known PIC assignments based on analysis
-- APP Team PICs (100% app revenue)
INSERT INTO public.team_pic_mappings (team_id, pic_name) VALUES
  ('APP', 'VN_minhlh'),
  ('APP', 'VN_anhtn'),
  ('APP', 'VN_hang')
ON CONFLICT (pic_name) DO NOTHING;

-- WEB_GV Team PICs (100% web revenue)
INSERT INTO public.team_pic_mappings (team_id, pic_name) VALUES
  ('WEB_GV', 'VN_ngocth'),
  ('WEB_GV', 'VN_ngantt')
ON CONFLICT (pic_name) DO NOTHING;

-- Insert product pattern fallbacks for unassigned PICs
INSERT INTO public.team_product_patterns (team_id, product_pattern, pattern_type, priority) VALUES
  ('WEB_GTI', 'ID_%', 'STARTS_WITH', 1),
  ('WEB_GTI', 'id_%', 'STARTS_WITH', 1),
  ('WEB_GV', 'VN_%', 'STARTS_WITH', 2),
  ('WEB_GV', 'vn_%', 'STARTS_WITH', 2),
  ('APP', 'app_%', 'STARTS_WITH', 3)
ON CONFLICT DO NOTHING;

-- Row Level Security Policies
ALTER TABLE public.team_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_pic_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_product_patterns ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all team data
CREATE POLICY "Allow authenticated users to read team configurations"
  ON public.team_configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read PIC mappings"
  ON public.team_pic_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read product patterns"
  ON public.team_product_patterns FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage team assignments
CREATE POLICY "Allow authenticated users to insert PIC mappings"
  ON public.team_pic_mappings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete PIC mappings"
  ON public.team_pic_mappings FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update PIC mappings"
  ON public.team_pic_mappings FOR UPDATE
  TO authenticated
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on team_configurations
CREATE TRIGGER update_team_configurations_updated_at
  BEFORE UPDATE ON public.team_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.team_configurations IS 'Defines available teams (WEB_GTI, WEB_GV, APP)';
COMMENT ON TABLE public.team_pic_mappings IS 'Maps PICs to teams - each PIC belongs to exactly one team';
COMMENT ON TABLE public.team_product_patterns IS 'Fallback pattern matching rules for unassigned PICs';
COMMENT ON COLUMN public.team_pic_mappings.pic_name IS 'PIC name from BigQuery (e.g., VN_minhlh, ID_john)';
COMMENT ON COLUMN public.team_product_patterns.product_pattern IS 'Pattern to match against pic or product fields in BigQuery';
