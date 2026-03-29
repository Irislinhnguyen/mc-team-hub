-- =====================================================
-- MC Bible: Add Slides/Presentations Support
-- =====================================================

-- Add slide_deck_url column to bible_articles table
ALTER TABLE public.bible_articles
ADD COLUMN slide_deck_url TEXT;

-- Add constraint for valid URL format
ALTER TABLE public.bible_articles
ADD CONSTRAINT slide_deck_url_format
CHECK (slide_deck_url IS NULL OR slide_deck_url ~* '^https?://[^/]+');

-- Add comment to document the new column
COMMENT ON COLUMN public.bible_articles.slide_deck_url IS 'URL to slide deck presentation (Google Slides, PowerPoint Online, etc.)';

-- Update content_type check constraint to include 'slides'
ALTER TABLE public.bible_articles
DROP CONSTRAINT IF EXISTS bible_articles_content_type_check;

ALTER TABLE public.bible_articles
ADD CONSTRAINT bible_articles_content_type_check
CHECK (content_type IN ('article', 'howto', 'video', 'file', 'slides'));
