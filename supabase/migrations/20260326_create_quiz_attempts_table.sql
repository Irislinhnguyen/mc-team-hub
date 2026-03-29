-- Quiz attempts tracking
-- Stores user quiz attempts and results

CREATE TABLE IF NOT EXISTS bible_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES bible_articles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL, -- Number of correct answers
  total_questions INTEGER NOT NULL, -- Total questions in quiz
  answers JSONB NOT NULL, -- Store user's answers: [{questionIndex, selectedOption, isCorrect}]
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent multiple attempts per article (optional - remove if allowing retries)
  CONSTRAINT bible_quiz_attempts_unique UNIQUE (user_id, article_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS bible_quiz_attempts_user_id_idx ON bible_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS bible_quiz_attempts_article_id_idx ON bible_quiz_attempts(article_id);
CREATE INDEX IF NOT EXISTS bible_quiz_attempts_completed_at_idx ON bible_quiz_attempts(completed_at DESC);

-- Comment
COMMENT ON TABLE bible_quiz_attempts IS 'Stores quiz attempt results for tracking user progress';

SELECT 'Quiz attempts table created successfully' as status;
