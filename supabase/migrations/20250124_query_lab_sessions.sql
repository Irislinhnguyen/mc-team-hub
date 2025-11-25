-- ============================================
-- Query Lab Chat Sessions
-- ============================================
-- Enables ChatGPT/Claude-like experience with:
-- - Persistent sessions that users can continue anytime
-- - Auto-generated titles from first question
-- - Full conversation history with messages
-- ============================================

-- 1. Sessions table (conversation containers)
CREATE TABLE IF NOT EXISTS query_lab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Chat',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Messages table (conversation history)
CREATE TABLE IF NOT EXISTS query_lab_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES query_lab_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('question', 'plan', 'results', 'error', 'clarification')),
  sql TEXT,
  results JSONB,
  row_count INTEGER,
  confidence NUMERIC(3,2),
  warnings JSONB,
  result_title TEXT,
  retry_info JSONB,
  kg_info JSONB,  -- Knowledge Graph context used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON query_lab_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON query_lab_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON query_lab_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON query_lab_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON query_lab_messages(created_at);

-- 4. Function to update session timestamp and message count
CREATE OR REPLACE FUNCTION update_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE query_lab_sessions
  SET
    last_message_at = NEW.created_at,
    updated_at = NOW(),
    message_count = message_count + 1
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to auto-update session on new message
DROP TRIGGER IF EXISTS trigger_update_session_on_message ON query_lab_messages;
CREATE TRIGGER trigger_update_session_on_message
  AFTER INSERT ON query_lab_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_on_message();

-- 6. Function to auto-generate session title from first user message
CREATE OR REPLACE FUNCTION generate_session_title(question TEXT)
RETURNS TEXT AS $$
DECLARE
  title TEXT;
BEGIN
  -- Remove common prefixes
  title := regexp_replace(question, '^(show|find|get|list|display|what|how|can you|please|tìm|hiển thị|liệt kê|cho tôi|xem)\s+', '', 'i');

  -- Remove trailing punctuation
  title := regexp_replace(title, '[?!.,]+$', '');

  -- Trim and capitalize
  title := initcap(trim(title));

  -- Truncate to 50 chars
  IF length(title) > 50 THEN
    title := substring(title, 1, 47) || '...';
  END IF;

  -- Fallback
  IF title IS NULL OR title = '' THEN
    title := 'Query ' || to_char(NOW(), 'Mon DD HH24:MI');
  END IF;

  RETURN title;
END;
$$ LANGUAGE plpgsql;

-- 7. RLS Policies (users can only see their own sessions)
ALTER TABLE query_lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_lab_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS sessions_select_own ON query_lab_sessions;
DROP POLICY IF EXISTS sessions_insert_own ON query_lab_sessions;
DROP POLICY IF EXISTS sessions_update_own ON query_lab_sessions;
DROP POLICY IF EXISTS sessions_delete_own ON query_lab_sessions;
DROP POLICY IF EXISTS messages_select_own ON query_lab_messages;
DROP POLICY IF EXISTS messages_insert_own ON query_lab_messages;

-- Sessions policies
CREATE POLICY sessions_select_own ON query_lab_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY sessions_insert_own ON query_lab_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY sessions_update_own ON query_lab_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY sessions_delete_own ON query_lab_sessions
  FOR DELETE USING (user_id = auth.uid());

-- Messages policies (based on session ownership)
CREATE POLICY messages_select_own ON query_lab_messages
  FOR SELECT USING (
    session_id IN (SELECT id FROM query_lab_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY messages_insert_own ON query_lab_messages
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM query_lab_sessions WHERE user_id = auth.uid())
  );

-- 8. Grant permissions
GRANT ALL ON query_lab_sessions TO authenticated;
GRANT ALL ON query_lab_messages TO authenticated;
GRANT EXECUTE ON FUNCTION generate_session_title(TEXT) TO authenticated;
