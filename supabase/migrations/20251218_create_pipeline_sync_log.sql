-- Pipeline to Google Sheets Sync Log
-- Track all sync attempts for monitoring and debugging

-- Create pipeline_sync_log table
CREATE TABLE IF NOT EXISTS pipeline_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('create', 'update')),
  target_sheet TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_type TEXT NULL,
  error_message TEXT NULL,
  row_number INTEGER NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_sync_log_pipeline_id
  ON pipeline_sync_log(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_sync_log_status_date
  ON pipeline_sync_log(status, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_sync_log_synced_at
  ON pipeline_sync_log(synced_at DESC);

-- Add comments for documentation
COMMENT ON TABLE pipeline_sync_log IS 'Tracks all Pipeline → Google Sheets sync attempts';
COMMENT ON COLUMN pipeline_sync_log.sync_type IS 'Type of sync: create (new row) or update (existing row)';
COMMENT ON COLUMN pipeline_sync_log.target_sheet IS 'Target sheet name (SEA_Sales or SEA_CS)';
COMMENT ON COLUMN pipeline_sync_log.status IS 'Sync outcome: success or failed';
COMMENT ON COLUMN pipeline_sync_log.error_type IS 'Error classification: permission_denied, sheet_not_found, rate_limit, network_error, unknown';
COMMENT ON COLUMN pipeline_sync_log.error_message IS 'Human-readable error description';
COMMENT ON COLUMN pipeline_sync_log.row_number IS 'Sheet row number (null for failed syncs)';

-- Enable RLS
ALTER TABLE pipeline_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view sync logs for their own pipelines
CREATE POLICY "Users can view their pipeline sync logs"
  ON pipeline_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_sync_log.pipeline_id
        AND pipelines.user_id = auth.uid()
    )
  );

-- Service role can insert sync logs (used by sync service)
-- This is handled by service role key bypassing RLS

-- Create a view for sync monitoring dashboard (for admins/debugging)
CREATE OR REPLACE VIEW pipeline_sync_stats AS
SELECT
  DATE(synced_at) as sync_date,
  target_sheet,
  status,
  COUNT(*) as sync_count,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
  ROUND(
    100.0 * COUNT(CASE WHEN status = 'success' THEN 1 END) / COUNT(*),
    2
  ) as success_rate_percent
FROM pipeline_sync_log
GROUP BY DATE(synced_at), target_sheet, status
ORDER BY sync_date DESC, target_sheet;

COMMENT ON VIEW pipeline_sync_stats IS 'Daily sync statistics for monitoring sync health';
