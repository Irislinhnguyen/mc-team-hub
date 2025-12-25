-- Add Request (imp) and eCPM columns to pipelines table
-- These are user inputs that feed into calculated max_gross

ALTER TABLE pipelines
ADD COLUMN IF NOT EXISTS imp DECIMAL,  -- Request (impressions 30 days)
ADD COLUMN IF NOT EXISTS ecpm DECIMAL; -- eCPM (cost per 1000 impressions)

COMMENT ON COLUMN pipelines.imp IS 'Request: Impressions for 30 days (user input)';
COMMENT ON COLUMN pipelines.ecpm IS 'Effective cost per 1000 impressions (user input)';
COMMENT ON COLUMN pipelines.max_gross IS 'Maximum gross revenue per month - calculated as (imp/1000) × ecpm';
