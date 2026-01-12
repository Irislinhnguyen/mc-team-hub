-- Add targeted_product column to focus_of_month table
-- This stores the product that a Focus is targeting (e.g., "flexiblesticky", "videoads")
-- Used to filter MIDs that don't have this product yet

ALTER TABLE focus_of_month
ADD COLUMN targeted_product TEXT NULL;

-- Add comment
COMMENT ON COLUMN focus_of_month.targeted_product IS 'The product this focus is targeting (e.g., flexiblesticky, videoads)';
