-- Add column for "Other" reason detail when "cannot_create" is selected
-- This allows users to provide additional context when they select "Other" as the reason

ALTER TABLE focus_suggestions
ADD COLUMN IF NOT EXISTS cannot_create_reason_other TEXT;

-- Add comment for documentation
COMMENT ON COLUMN focus_suggestions.cannot_create_reason_other IS 'Additional detail when cannot_create_reason is "Other"';
