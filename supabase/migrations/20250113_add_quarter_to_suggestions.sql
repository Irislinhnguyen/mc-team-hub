-- Add quarter column to focus_suggestions table
-- This column stores the quarter of the most recent month (e.g., "Q1 2025")

ALTER TABLE focus_suggestions
ADD COLUMN quarter TEXT;

-- Add index for filtering
CREATE INDEX idx_focus_suggestions_quarter ON focus_suggestions(quarter);

-- Add comment
COMMENT ON COLUMN focus_suggestions.quarter IS 'Quarter of the most recent month (e.g., Q1 2025, Q2 2025)';
