-- Add tracking columns to team_pic_mappings table
-- This allows us to track who changed team assignments and when

ALTER TABLE public.team_pic_mappings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by_email TEXT;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_pic_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on any update
DROP TRIGGER IF EXISTS trigger_update_team_pic_mappings_updated_at ON public.team_pic_mappings;
CREATE TRIGGER trigger_update_team_pic_mappings_updated_at
  BEFORE UPDATE ON public.team_pic_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_team_pic_mappings_updated_at();

-- Add comments
COMMENT ON COLUMN public.team_pic_mappings.updated_at IS 'Timestamp when assignment was last changed';
COMMENT ON COLUMN public.team_pic_mappings.updated_by_email IS 'Email of user who made the change';
