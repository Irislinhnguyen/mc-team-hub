-- Quiz data field for articles
-- Stores quiz questions as JSONB
-- Schema: [{ question, options: [], correct_answer: number, explanation: string }]

ALTER TABLE bible_articles ADD COLUMN IF NOT EXISTS quiz_data JSONB;

-- Add constraint to ensure quiz_data is valid array if present
-- (Optional - commented out for flexibility)
-- ALTER TABLE bible_articles ADD CONSTRAINT quiz_data_is_array CHECK (quiz_data IS NULL OR jsonb_typeof(quiz_data) = 'array');

COMMENT ON COLUMN bible_articles.quiz_data IS 'Quiz questions embedded in article. Array of {question, options, correct_answer, explanation}.';

SELECT 'Quiz data field added successfully' as status;
