-- Optimize Query Lab Sessions Performance
-- Add composite index for efficient session list queries

-- Drop old single-column indexes that will be covered by the composite index
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_status;
DROP INDEX IF EXISTS idx_sessions_updated;

-- Create composite index for the common query pattern:
-- WHERE user_id = X AND status = Y ORDER BY last_message_at DESC
CREATE INDEX IF NOT EXISTS idx_sessions_user_status_last_msg
  ON query_lab_sessions(user_id, status, last_message_at DESC NULLS LAST);

-- This single composite index will efficiently handle:
-- 1. Filtering by user_id
-- 2. Filtering by status
-- 3. Sorting by last_message_at DESC
-- 4. LIMIT/pagination

-- Add index on session_id for query_lab_messages joins
CREATE INDEX IF NOT EXISTS idx_messages_session_id
  ON query_lab_messages(session_id, created_at);

-- Add comment
COMMENT ON INDEX idx_sessions_user_status_last_msg IS
  'Composite index for efficient session list queries with user_id, status filter and last_message_at sort';
