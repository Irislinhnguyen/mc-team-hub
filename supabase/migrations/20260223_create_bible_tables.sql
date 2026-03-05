-- =====================================================
-- MC Bible (Course Edition) - Database Schema
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. BIBLE_PATHS TABLE
-- Learning paths (courses/learning tracks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bible_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon name
  color TEXT, -- theme color for UI (hex format)
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_color CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for bible_paths
CREATE INDEX idx_bible_paths_created_by ON public.bible_paths(created_by);
CREATE INDEX idx_bible_paths_title ON public.bible_paths(title);

-- =====================================================
-- 2. BIBLE_ARTICLES TABLE
-- Individual wiki pages/guides/articles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bible_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- rich HTML/Markdown content
  content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN ('article', 'howto', 'video', 'file')),
  video_url TEXT, -- for video type
  file_url TEXT, -- for file attachments
  file_name TEXT, -- original file name
  file_size BIGINT, -- file size in bytes
  tags TEXT[], -- tags for categorization
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bible_articles
CREATE INDEX idx_bible_articles_created_by ON public.bible_articles(created_by);
CREATE INDEX idx_bible_articles_content_type ON public.bible_articles(content_type);
CREATE INDEX idx_bible_articles_tags ON public.bible_articles USING GIN(tags);
CREATE INDEX idx_bible_articles_title ON public.bible_articles(title);

-- Full-text search index
CREATE INDEX idx_bible_articles_fulltext ON public.bible_articles USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- =====================================================
-- 3. BIBLE_PATH_ARTICLES TABLE
-- Junction table linking articles to paths with ordering
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bible_path_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.bible_paths(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.bible_articles(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_path_article UNIQUE(path_id, article_id)
);

-- Indexes for bible_path_articles
CREATE INDEX idx_bible_path_articles_path ON public.bible_path_articles(path_id, display_order);
CREATE INDEX idx_bible_path_articles_article ON public.bible_path_articles(article_id);

-- =====================================================
-- 4. BIBLE_USER_PROGRESS TABLE
-- Tracks which articles user has read/completed
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bible_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.bible_articles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_article UNIQUE(user_id, article_id)
);

-- Indexes for bible_user_progress
CREATE INDEX idx_bible_user_progress_user ON public.bible_user_progress(user_id);
CREATE INDEX idx_bible_user_progress_article ON public.bible_user_progress(article_id);
CREATE INDEX idx_bible_user_progress_completed ON public.bible_user_progress(completed_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.bible_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_path_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_user_progress ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- BIBLE_PATHS Policies
-- -----------------------------------------------------

-- All authenticated users can view all paths (open access)
CREATE POLICY "All users can view paths"
  ON public.bible_paths FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin/Manager/Leader can create paths
CREATE POLICY "Admin/Manager/Leader can create paths"
  ON public.bible_paths FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leader')
    )
  );

-- Admin/Manager/Leader can update paths
CREATE POLICY "Admin/Manager/Leader can update paths"
  ON public.bible_paths FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leader')
    )
  );

-- Admin/Manager can delete paths
CREATE POLICY "Admin/Manager can delete paths"
  ON public.bible_paths FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- -----------------------------------------------------
-- BIBLE_ARTICLES Policies
-- -----------------------------------------------------

-- All authenticated users can view all articles (open access)
CREATE POLICY "All users can view articles"
  ON public.bible_articles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin/Manager/Leader can create articles
CREATE POLICY "Admin/Manager/Leader can create articles"
  ON public.bible_articles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leader')
    )
  );

-- Admin/Manager/Leader can update articles
CREATE POLICY "Admin/Manager/Leader can update articles"
  ON public.bible_articles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leader')
    )
  );

-- Admin/Manager can delete articles
CREATE POLICY "Admin/Manager can delete articles"
  ON public.bible_articles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- -----------------------------------------------------
-- BIBLE_PATH_ARTICLES Policies
-- -----------------------------------------------------

-- All authenticated users can view path-article relationships
CREATE POLICY "All users can view path articles"
  ON public.bible_path_articles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin/Manager/Leader can manage path-article relationships
CREATE POLICY "Admin/Manager/Leader can manage path articles"
  ON public.bible_path_articles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leader')
    )
  );

-- -----------------------------------------------------
-- BIBLE_USER_PROGRESS Policies
-- -----------------------------------------------------

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
  ON public.bible_user_progress FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own progress entries
CREATE POLICY "Users can create own progress"
  ON public.bible_user_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own progress entries
CREATE POLICY "Users can update own progress"
  ON public.bible_user_progress FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own progress entries (unmark as complete)
CREATE POLICY "Users can delete own progress"
  ON public.bible_user_progress FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
// =====================================================

-- Function to get user's progress for a specific path
CREATE OR REPLACE FUNCTION get_path_progress(p_path_id UUID, p_user_id UUID)
RETURNS TABLE(total_articles BIGINT, completed_articles BIGINT, progress_percentage NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_articles,
    COUNT(p.id)::BIGINT as completed_articles,
    CASE
      WHEN COUNT(*) > 0 THEN (COUNT(p.id)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as progress_percentage
  FROM public.bible_path_articles pa
  LEFT JOIN public.bible_user_progress p ON p.article_id = pa.article_id AND p.user_id = p_user_id
  WHERE pa.path_id = p_path_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search articles by title/content
CREATE OR REPLACE FUNCTION search_articles(p_search_term TEXT)
RETURNS TABLE(article_id UUID, title TEXT, content_type TEXT, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.content_type,
    ts_rank(to_tsvector('english', a.title || ' ' || COALESCE(a.content, '')), plainto_tsquery('english', p_search_term)) as rank
  FROM public.bible_articles a
  WHERE to_tsvector('english', a.title || ' ' || COALESCE(a.content, '')) @@ plainto_tsquery('english', p_search_term)
  ORDER BY rank DESC, a.title;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_bible_paths_updated_at
  BEFORE UPDATE ON public.bible_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bible_articles_updated_at
  BEFORE UPDATE ON public.bible_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================

-- Note: Storage buckets need to be created via Supabase client or dashboard
-- The bucket 'bible-files' should be created with:
-- - Public: true (for file access)
-- - File size limit: 10485760 (10MB)
-- - Allowed MIME types: PDF, Office docs, images, videos

-- Insert storage.policies for the bible-files bucket
-- These will be applied after the bucket is created

-- Policy: Allow public access to view files
INSERT INTO storage.policies (name, definition, created_at)
VALUES
(
  'bible-files-public-view',
  '{
    "bucketId": "bible-files",
    "operations": ["GET"],
    "definition": {
      "type": "select",
      "table": {
        "schema": "storage",
        "name": "objects"
      },
      "condition": {
        "type": "eq",
        "key": "bucket_id",
        "value": "' || (SELECT id FROM storage.buckets WHERE name = 'bible-files')::text || '"
      }
    }
  }'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant usage on sequences (if any)
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on all tables to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant additional permissions as needed for RLS to work
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
