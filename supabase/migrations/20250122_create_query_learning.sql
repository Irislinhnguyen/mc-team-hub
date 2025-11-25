-- Query Learning Tables for ML Feedback Loop
-- Replaces Neo4j with Supabase-based learning

-- Table: Store all query feedback
CREATE TABLE IF NOT EXISTS query_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  sql_generated TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'error')),
  feedback_text TEXT,
  error_message TEXT,
  error_signature TEXT, -- Fingerprint for grouping similar errors
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Learned rules from feedback patterns
CREATE TABLE IF NOT EXISTS learned_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('column_fix', 'pattern_fix', 'prompt_hint')),
  pattern TEXT NOT NULL, -- What to look for (e.g., "p.total_revenue")
  correction TEXT NOT NULL, -- What to replace with (e.g., "SUM(p.rev) as total_revenue")
  description TEXT, -- Human readable explanation
  occurrences INT DEFAULT 1,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rule_type, pattern)
);

-- Table: Error patterns (aggregated from query_feedback)
CREATE TABLE IF NOT EXISTS error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_signature TEXT UNIQUE NOT NULL,
  error_type TEXT, -- 'column', 'syntax', 'semantic'
  example_message TEXT,
  example_question TEXT,
  example_sql TEXT,
  occurrences INT DEFAULT 1,
  resolved BOOLEAN DEFAULT false,
  resolution_rule_id UUID REFERENCES learned_rules(id),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_feedback_created ON query_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_feedback_type ON query_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_query_feedback_signature ON query_feedback(error_signature);
CREATE INDEX IF NOT EXISTS idx_learned_rules_active ON learned_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_learned_rules_pattern ON learned_rules(pattern);
CREATE INDEX IF NOT EXISTS idx_error_patterns_signature ON error_patterns(error_signature);
CREATE INDEX IF NOT EXISTS idx_error_patterns_unresolved ON error_patterns(resolved) WHERE resolved = false;

-- Function: Increment error pattern count
CREATE OR REPLACE FUNCTION increment_error_pattern(
  p_signature TEXT,
  p_type TEXT,
  p_message TEXT,
  p_question TEXT,
  p_sql TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO error_patterns (error_signature, error_type, example_message, example_question, example_sql)
  VALUES (p_signature, p_type, p_message, p_question, p_sql)
  ON CONFLICT (error_signature) DO UPDATE SET
    occurrences = error_patterns.occurrences + 1,
    last_seen = NOW(),
    example_message = EXCLUDED.example_message,
    example_question = EXCLUDED.example_question,
    example_sql = EXCLUDED.example_sql;
END;
$$ LANGUAGE plpgsql;

-- Function: Add or update learned rule
CREATE OR REPLACE FUNCTION upsert_learned_rule(
  p_rule_type TEXT,
  p_pattern TEXT,
  p_correction TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO learned_rules (rule_type, pattern, correction, description)
  VALUES (p_rule_type, p_pattern, p_correction, p_description)
  ON CONFLICT (rule_type, pattern) DO UPDATE SET
    correction = EXCLUDED.correction,
    occurrences = learned_rules.occurrences + 1,
    last_seen = NOW(),
    is_active = true
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- View: Frequently occurring errors (candidates for new rules)
CREATE OR REPLACE VIEW error_pattern_candidates AS
SELECT
  ep.*,
  CASE
    WHEN ep.occurrences >= 5 THEN 'high'
    WHEN ep.occurrences >= 3 THEN 'medium'
    ELSE 'low'
  END AS priority
FROM error_patterns ep
WHERE ep.resolved = false
  AND ep.occurrences >= 3
ORDER BY ep.occurrences DESC;

-- Seed some initial learned rules based on known patterns
INSERT INTO learned_rules (rule_type, pattern, correction, description) VALUES
  ('column_fix', 'p.total_revenue', 'SUM(p.rev) as total_revenue', 'AI often generates p.total_revenue instead of aggregate'),
  ('column_fix', 'p.total_profit', 'SUM(p.profit) as total_profit', 'AI often generates p.total_profit instead of aggregate'),
  ('column_fix', 'p.total_impressions', 'SUM(p.req) as total_impressions', 'AI often generates p.total_impressions instead of aggregate'),
  ('column_fix', 'p.revenue', 'p.rev', 'Column is named rev not revenue'),
  ('column_fix', 'p.impressions', 'p.req', 'Column is named req not impressions'),
  ('column_fix', 'p.mname', 'p.medianame', 'Column is named medianame not mname'),
  ('column_fix', 'p.pname', 'p.pubname', 'Column is named pubname not pname'),
  ('column_fix', 'p.zname', 'p.zonename', 'Column is named zonename not zname')
ON CONFLICT (rule_type, pattern) DO NOTHING;

-- RLS Policies
ALTER TABLE query_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback
CREATE POLICY "Users can insert their own feedback" ON query_feedback
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow reading feedback for analytics
CREATE POLICY "Admins can read all feedback" ON query_feedback
  FOR SELECT TO authenticated
  USING (true);

-- Learned rules are readable by all authenticated users
CREATE POLICY "Anyone can read active rules" ON learned_rules
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Only admins can modify rules
CREATE POLICY "Admins can manage rules" ON learned_rules
  FOR ALL TO authenticated
  USING (true);

-- Error patterns readable by all
CREATE POLICY "Anyone can read error patterns" ON error_patterns
  FOR SELECT TO authenticated
  USING (true);
