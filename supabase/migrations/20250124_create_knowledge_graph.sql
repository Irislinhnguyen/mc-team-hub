-- Knowledge Graph Migration
-- Creates tables for AI "brain" to understand business concepts, query patterns, and rules
-- This replaces the deprecated Neo4j implementation with Supabase-based storage

-- ============================================================================
-- TABLE 1: kg_tables - BigQuery table metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS kg_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  full_path TEXT NOT NULL,
  description TEXT,
  table_type TEXT DEFAULT 'fact', -- fact, dimension, snapshot, aggregate
  columns_json JSONB, -- Array of {name, type, description, is_key}
  join_hints JSONB, -- Array of {to_table, join_type, on_condition}
  sample_queries JSONB, -- Array of example SQL queries
  row_count BIGINT,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active tables lookup
CREATE INDEX IF NOT EXISTS idx_kg_tables_active ON kg_tables(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE 2: kg_concepts - Semantic term mapping (multilingual)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kg_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multilingual terms
  term_vi TEXT, -- Vietnamese
  term_en TEXT, -- English
  term_jp TEXT, -- Japanese
  term_id TEXT, -- Indonesian

  -- What this concept maps to
  maps_to_type TEXT NOT NULL, -- column, table, metric, entity, time_expression, aggregate_function
  maps_to_value TEXT NOT NULL, -- actual column name, table name, or expression
  maps_to_table TEXT, -- which table this column belongs to (if maps_to_type = 'column')

  -- Context and usage
  context TEXT, -- when to use this mapping
  examples JSONB, -- Array of example sentences using this concept
  priority INT DEFAULT 0, -- higher = preferred when multiple matches

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- At least one term is required
  CONSTRAINT at_least_one_term CHECK (
    term_vi IS NOT NULL OR term_en IS NOT NULL OR term_jp IS NOT NULL OR term_id IS NOT NULL
  )
);

-- Indexes for concept lookup by language
CREATE INDEX IF NOT EXISTS idx_kg_concepts_vi ON kg_concepts(term_vi) WHERE term_vi IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_concepts_en ON kg_concepts(term_en) WHERE term_en IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_concepts_jp ON kg_concepts(term_jp) WHERE term_jp IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_concepts_id ON kg_concepts(term_id) WHERE term_id IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_concepts_type ON kg_concepts(maps_to_type, is_active);

-- ============================================================================
-- TABLE 3: kg_query_patterns - Reusable SQL templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS kg_query_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern identification
  pattern_name TEXT NOT NULL UNIQUE,
  pattern_category TEXT NOT NULL, -- ranking, comparison, breakdown, aggregation, filter, join

  -- Intent matching
  intent_keywords JSONB NOT NULL, -- Array of keywords that trigger this pattern
  intent_description TEXT, -- Natural language description of when to use

  -- SQL template
  sql_template TEXT NOT NULL, -- SQL with {{placeholders}}
  required_params JSONB, -- Array of {name, type, description, default}
  optional_params JSONB, -- Array of {name, type, description, default}

  -- Examples
  example_questions JSONB, -- Array of example questions that use this pattern
  example_sql JSONB, -- Array of filled-in SQL examples

  -- Constraints and notes
  constraints JSONB, -- BigQuery-specific constraints to check
  notes TEXT, -- Implementation notes

  -- Metrics
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  avg_execution_time_ms FLOAT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for pattern lookup
CREATE INDEX IF NOT EXISTS idx_kg_patterns_category ON kg_query_patterns(pattern_category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_patterns_active ON kg_query_patterns(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE 4: kg_business_rules - Domain-specific logic
-- ============================================================================
CREATE TABLE IF NOT EXISTS kg_business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL, -- definition, formula, constraint, compatibility, threshold

  -- Rule definition
  description TEXT NOT NULL, -- Human-readable description
  condition_sql TEXT, -- SQL expression for the condition
  condition_json JSONB, -- Structured condition definition

  -- Action/Result
  result_expression TEXT, -- What to return/calculate
  action TEXT, -- What action to take when rule matches

  -- Context
  applies_to_entities JSONB, -- Array of entity types this applies to (pid, mid, zid, product)
  priority INT DEFAULT 0,

  -- Examples
  examples JSONB, -- Array of {input, output, explanation}

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rule lookup
CREATE INDEX IF NOT EXISTS idx_kg_rules_type ON kg_business_rules(rule_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_rules_active ON kg_business_rules(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE 5: kg_examples - Successful query examples for learning
-- ============================================================================
CREATE TABLE IF NOT EXISTS kg_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The question and answer
  question TEXT NOT NULL,
  question_language TEXT DEFAULT 'vi', -- vi, en, jp, id
  sql_generated TEXT NOT NULL,

  -- Metadata about the query
  tables_used JSONB, -- Array of table names
  concepts_used JSONB, -- Array of concept IDs used
  patterns_used JSONB, -- Array of pattern IDs used

  -- Results summary (not full data)
  result_row_count INT,
  result_columns JSONB, -- Array of column names
  execution_time_ms INT,

  -- Feedback
  feedback_type TEXT DEFAULT 'auto_success', -- auto_success, user_positive, user_negative, user_corrected
  feedback_text TEXT,
  corrected_sql TEXT, -- If user provided correction

  -- For similarity search
  question_embedding VECTOR(1536), -- OpenAI embedding for similarity search

  -- Metadata
  user_id UUID REFERENCES users(id),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for example lookup
CREATE INDEX IF NOT EXISTS idx_kg_examples_language ON kg_examples(question_language);
CREATE INDEX IF NOT EXISTS idx_kg_examples_feedback ON kg_examples(feedback_type);
CREATE INDEX IF NOT EXISTS idx_kg_examples_created ON kg_examples(created_at DESC);

-- ============================================================================
-- TABLE 6: kg_synonyms - Term synonyms across languages
-- ============================================================================
CREATE TABLE IF NOT EXISTS kg_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The canonical term (reference)
  canonical_term TEXT NOT NULL,

  -- The synonym
  synonym TEXT NOT NULL,
  language TEXT NOT NULL, -- vi, en, jp, id

  -- Relationship
  relationship TEXT DEFAULT 'equivalent', -- equivalent, broader, narrower, related
  confidence FLOAT DEFAULT 1.0, -- 0-1, how confident is this mapping

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(canonical_term, synonym, language)
);

-- Index for synonym lookup
CREATE INDEX IF NOT EXISTS idx_kg_synonyms_term ON kg_synonyms(canonical_term) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_synonyms_synonym ON kg_synonyms(synonym) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kg_synonyms_language ON kg_synonyms(language) WHERE is_active = true;

-- ============================================================================
-- TABLE 7: kg_suggestions - Pending suggestions from learning loop
-- ============================================================================
CREATE TABLE IF NOT EXISTS kg_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What type of suggestion
  suggestion_type TEXT NOT NULL, -- new_concept, new_pattern, new_rule, new_synonym, update_concept

  -- The suggested data
  suggested_data JSONB NOT NULL,

  -- Source of suggestion
  source_type TEXT NOT NULL, -- auto_detected, user_feedback, error_pattern
  source_id UUID, -- Reference to kg_examples.id or error_patterns.id
  source_question TEXT,
  source_context JSONB,

  -- Review status
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, merged
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,

  -- Metrics
  occurrence_count INT DEFAULT 1, -- How many times this was suggested

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for pending suggestions
CREATE INDEX IF NOT EXISTS idx_kg_suggestions_status ON kg_suggestions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_kg_suggestions_type ON kg_suggestions(suggestion_type, status);

-- ============================================================================
-- FUNCTIONS: Helper functions for Knowledge Graph operations
-- ============================================================================

-- Function to increment concept usage
CREATE OR REPLACE FUNCTION increment_concept_usage(concept_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE kg_concepts
  SET usage_count = usage_count + 1,
      last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = concept_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment pattern success/failure
CREATE OR REPLACE FUNCTION update_pattern_metrics(
  pattern_id UUID,
  is_success BOOLEAN,
  exec_time_ms INT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF is_success THEN
    UPDATE kg_query_patterns
    SET success_count = success_count + 1,
        avg_execution_time_ms = CASE
          WHEN avg_execution_time_ms IS NULL THEN exec_time_ms
          ELSE (avg_execution_time_ms * success_count + COALESCE(exec_time_ms, 0)) / (success_count + 1)
        END,
        updated_at = NOW()
    WHERE id = pattern_id;
  ELSE
    UPDATE kg_query_patterns
    SET failure_count = failure_count + 1,
        updated_at = NOW()
    WHERE id = pattern_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create or update suggestion
CREATE OR REPLACE FUNCTION upsert_kg_suggestion(
  p_suggestion_type TEXT,
  p_suggested_data JSONB,
  p_source_type TEXT,
  p_source_question TEXT DEFAULT NULL,
  p_source_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if similar suggestion already exists
  SELECT id INTO v_existing_id
  FROM kg_suggestions
  WHERE suggestion_type = p_suggestion_type
    AND suggested_data = p_suggested_data
    AND status = 'pending'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Increment occurrence count
    UPDATE kg_suggestions
    SET occurrence_count = occurrence_count + 1,
        updated_at = NOW()
    WHERE id = v_existing_id;
    RETURN v_existing_id;
  ELSE
    -- Create new suggestion
    INSERT INTO kg_suggestions (
      suggestion_type, suggested_data, source_type, source_question, source_context
    )
    VALUES (
      p_suggestion_type, p_suggested_data, p_source_type, p_source_question, p_source_context
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS: Useful views for Knowledge Graph
-- ============================================================================

-- View: Active concepts with usage stats
CREATE OR REPLACE VIEW kg_concepts_active AS
SELECT
  id,
  term_vi,
  term_en,
  term_jp,
  term_id,
  maps_to_type,
  maps_to_value,
  maps_to_table,
  context,
  priority,
  usage_count,
  last_used_at
FROM kg_concepts
WHERE is_active = true
ORDER BY priority DESC, usage_count DESC;

-- View: Pattern success rates
CREATE OR REPLACE VIEW kg_patterns_stats AS
SELECT
  id,
  pattern_name,
  pattern_category,
  success_count,
  failure_count,
  CASE
    WHEN (success_count + failure_count) > 0
    THEN ROUND(success_count::NUMERIC / (success_count + failure_count) * 100, 2)
    ELSE 0
  END as success_rate_pct,
  avg_execution_time_ms
FROM kg_query_patterns
WHERE is_active = true
ORDER BY success_rate_pct DESC, success_count DESC;

-- View: Pending suggestions with high occurrence
CREATE OR REPLACE VIEW kg_suggestions_pending AS
SELECT
  id,
  suggestion_type,
  suggested_data,
  source_type,
  source_question,
  occurrence_count,
  created_at
FROM kg_suggestions
WHERE status = 'pending'
ORDER BY occurrence_count DESC, created_at ASC;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE kg_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_query_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies for kg_tables (read-only for all authenticated)
CREATE POLICY "kg_tables_read" ON kg_tables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kg_tables_admin" ON kg_tables
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Policies for kg_concepts (read-only for all authenticated)
CREATE POLICY "kg_concepts_read" ON kg_concepts
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "kg_concepts_admin" ON kg_concepts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Policies for kg_query_patterns (read-only for all authenticated)
CREATE POLICY "kg_patterns_read" ON kg_query_patterns
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "kg_patterns_admin" ON kg_query_patterns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Policies for kg_business_rules (read-only for all authenticated)
CREATE POLICY "kg_rules_read" ON kg_business_rules
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "kg_rules_admin" ON kg_business_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Policies for kg_examples (users can insert, read all)
CREATE POLICY "kg_examples_read" ON kg_examples
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kg_examples_insert" ON kg_examples
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "kg_examples_admin" ON kg_examples
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Policies for kg_synonyms (read-only for all authenticated)
CREATE POLICY "kg_synonyms_read" ON kg_synonyms
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "kg_synonyms_admin" ON kg_synonyms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Policies for kg_suggestions (users can insert, admins can manage)
CREATE POLICY "kg_suggestions_read" ON kg_suggestions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kg_suggestions_insert" ON kg_suggestions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "kg_suggestions_admin" ON kg_suggestions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE kg_tables IS 'BigQuery table metadata for AI context';
COMMENT ON TABLE kg_concepts IS 'Semantic term mapping - business terms to SQL columns/expressions';
COMMENT ON TABLE kg_query_patterns IS 'Reusable SQL templates for common query patterns';
COMMENT ON TABLE kg_business_rules IS 'Domain-specific business logic and formulas';
COMMENT ON TABLE kg_examples IS 'Successful query examples for AI learning';
COMMENT ON TABLE kg_synonyms IS 'Term synonyms across languages';
COMMENT ON TABLE kg_suggestions IS 'Pending suggestions from learning loop';
