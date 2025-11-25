-- Create OpenAI Usage Tracking Tables
-- This migration creates tables for comprehensive OpenAI API usage tracking and cost monitoring

-- ============================================================================
-- Table: openai_usage_logs
-- Purpose: Track every OpenAI API call with detailed token usage and cost
-- ============================================================================
CREATE TABLE openai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Information
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'manager', 'user')),

  -- API Call Information
  endpoint TEXT NOT NULL, -- e.g., '/api/query-lab/parse', '/api/analyze'
  feature TEXT NOT NULL, -- 'sql_generation', 'query_parsing', 'result_analysis', 'reasoning', 'simple_plan'
  model TEXT NOT NULL, -- 'gpt-4o', 'gpt-4-turbo-preview', etc.

  -- Token Usage (from OpenAI API response.usage)
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Cost Calculation (in USD)
  input_cost DECIMAL(10,6) NOT NULL DEFAULT 0, -- Cost for prompt tokens
  output_cost DECIMAL(10,6) NOT NULL DEFAULT 0, -- Cost for completion tokens
  total_cost DECIMAL(10,6) NOT NULL DEFAULT 0, -- Total cost

  -- Request/Response Details
  request_summary TEXT, -- First 200 chars of user question/prompt
  response_status TEXT NOT NULL DEFAULT 'success' CHECK (response_status IN ('success', 'error', 'timeout', 'rate_limit')),
  error_message TEXT, -- Error details if response_status != 'success'
  execution_time_ms INTEGER, -- Time taken for API call in milliseconds

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_openai_logs_user_id ON openai_usage_logs(user_id);
CREATE INDEX idx_openai_logs_created_at ON openai_usage_logs(created_at DESC);
CREATE INDEX idx_openai_logs_feature ON openai_usage_logs(feature);
CREATE INDEX idx_openai_logs_model ON openai_usage_logs(model);
CREATE INDEX idx_openai_logs_date ON openai_usage_logs(DATE(created_at));
CREATE INDEX idx_openai_logs_user_date ON openai_usage_logs(user_id, DATE(created_at));

-- Comments for documentation
COMMENT ON TABLE openai_usage_logs IS 'Comprehensive log of all OpenAI API calls with token usage and cost tracking';
COMMENT ON COLUMN openai_usage_logs.feature IS 'Feature using OpenAI: sql_generation, query_parsing, result_analysis, reasoning, simple_plan';
COMMENT ON COLUMN openai_usage_logs.request_summary IS 'First 200 characters of the user prompt for audit purposes';
COMMENT ON COLUMN openai_usage_logs.total_cost IS 'Total cost in USD calculated from input_cost + output_cost';

-- ============================================================================
-- Table: openai_daily_summary
-- Purpose: Pre-aggregated daily statistics for faster dashboard queries
-- ============================================================================
CREATE TABLE openai_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Aggregation Dimensions
  date DATE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Aggregated Metrics
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_prompt_tokens INTEGER NOT NULL DEFAULT 0,
  total_completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,4) NOT NULL DEFAULT 0,

  -- Success/Error Stats
  successful_calls INTEGER NOT NULL DEFAULT 0,
  failed_calls INTEGER NOT NULL DEFAULT 0,
  avg_execution_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique combination per day
  UNIQUE(date, user_id, feature, model)
);

-- Indexes for efficient aggregation queries
CREATE INDEX idx_daily_summary_date ON openai_daily_summary(date DESC);
CREATE INDEX idx_daily_summary_user_id ON openai_daily_summary(user_id);
CREATE INDEX idx_daily_summary_feature ON openai_daily_summary(feature);
CREATE INDEX idx_daily_summary_model ON openai_daily_summary(model);
CREATE INDEX idx_daily_summary_date_user ON openai_daily_summary(date, user_id);

-- Comments for documentation
COMMENT ON TABLE openai_daily_summary IS 'Pre-aggregated daily statistics for faster dashboard queries and trend analysis';
COMMENT ON COLUMN openai_daily_summary.total_calls IS 'Total number of API calls for this combination';
COMMENT ON COLUMN openai_daily_summary.avg_execution_time_ms IS 'Average execution time in milliseconds';

-- ============================================================================
-- Function: Update daily summary automatically
-- Purpose: Aggregate data from logs into daily summary (can be called via cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_openai_daily_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO openai_daily_summary (
    date, user_id, user_email, user_role, feature, model,
    total_calls, total_prompt_tokens, total_completion_tokens, total_tokens, total_cost,
    successful_calls, failed_calls, avg_execution_time_ms,
    updated_at
  )
  SELECT
    DATE(created_at) as date,
    user_id,
    user_email,
    user_role,
    feature,
    model,
    COUNT(*) as total_calls,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost) as total_cost,
    COUNT(*) FILTER (WHERE response_status = 'success') as successful_calls,
    COUNT(*) FILTER (WHERE response_status != 'success') as failed_calls,
    AVG(execution_time_ms)::INTEGER as avg_execution_time_ms,
    NOW() as updated_at
  FROM openai_usage_logs
  WHERE DATE(created_at) = target_date
  GROUP BY DATE(created_at), user_id, user_email, user_role, feature, model
  ON CONFLICT (date, user_id, feature, model)
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    total_prompt_tokens = EXCLUDED.total_prompt_tokens,
    total_completion_tokens = EXCLUDED.total_completion_tokens,
    total_tokens = EXCLUDED.total_tokens,
    total_cost = EXCLUDED.total_cost,
    successful_calls = EXCLUDED.successful_calls,
    failed_calls = EXCLUDED.failed_calls,
    avg_execution_time_ms = EXCLUDED.avg_execution_time_ms,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_openai_daily_summary IS 'Aggregates usage logs into daily summary. Run daily via cron or manually for specific dates.';

-- ============================================================================
-- Row Level Security (RLS) Policies
-- Purpose: Ensure only admins and managers can view usage data
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE openai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE openai_daily_summary ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and managers can view all logs
CREATE POLICY "Admins and managers can view all usage logs"
  ON openai_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Policy: Admins and managers can view all summaries
CREATE POLICY "Admins and managers can view all daily summaries"
  ON openai_daily_summary
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Policy: System can insert logs (service account)
CREATE POLICY "System can insert usage logs"
  ON openai_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can insert/update summaries
CREATE POLICY "System can manage daily summaries"
  ON openai_daily_summary
  FOR ALL
  WITH CHECK (true);

-- ============================================================================
-- Initial Setup
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON openai_usage_logs TO authenticated;
GRANT SELECT ON openai_daily_summary TO authenticated;
GRANT INSERT ON openai_usage_logs TO authenticated;
GRANT ALL ON openai_daily_summary TO authenticated;

-- Create initial daily summary for today
SELECT update_openai_daily_summary(CURRENT_DATE);

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ OpenAI usage tracking tables created successfully';
  RAISE NOTICE '📊 Tables: openai_usage_logs, openai_daily_summary';
  RAISE NOTICE '🔒 RLS policies enabled for admin/manager access';
  RAISE NOTICE '⚡ Function: update_openai_daily_summary() ready for daily aggregation';
END $$;
