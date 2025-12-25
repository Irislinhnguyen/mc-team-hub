-- Add end_date column to pipelines table
-- This is used to auto-calculate delivery_days for monthly forecasts
-- Replaces manual delivery_days input from Google Sheet

-- Add end_date column
ALTER TABLE pipelines
ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN pipelines.end_date IS 'Pipeline end date (Column AX) - used to auto-calculate delivery_days for each month';
