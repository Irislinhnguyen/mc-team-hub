-- Certificate tracking table
-- Tracks generated certificates for paths completed by users

CREATE TABLE IF NOT EXISTS bible_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES bible_paths(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloaded_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,

  -- Unique constraint: One certificate per user per path
  CONSTRAINT bible_certificates_unique UNIQUE (user_id, path_id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bible_certificates_user ON bible_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_certificates_path ON bible_certificates(path_id);
CREATE INDEX IF NOT EXISTS idx_bible_certificates_generated ON bible_certificates(generated_at DESC);

-- Add comments
COMMENT ON TABLE bible_certificates IS 'Tracks certificate generation for completed learning paths';
COMMENT ON COLUMN bible_certificates.user_id IS 'User who earned the certificate';
COMMENT ON COLUMN bible_certificates.path_id IS 'Learning path that was completed';
COMMENT ON COLUMN bible_certificates.generated_at IS 'When certificate was generated';
COMMENT ON COLUMN bible_certificates.downloaded_at IS 'Last time certificate was downloaded';
COMMENT ON COLUMN bible_certificates.download_count IS 'Number of times downloaded';
