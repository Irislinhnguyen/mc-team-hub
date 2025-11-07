-- Add advanced_filter_names column to filter_presets table
-- This stores the names of advanced filters used in a preset

ALTER TABLE filter_presets
ADD COLUMN IF NOT EXISTS advanced_filter_names TEXT[] DEFAULT '{}';

COMMENT ON COLUMN filter_presets.advanced_filter_names IS 'Names of advanced filters used in this preset for display purposes';
