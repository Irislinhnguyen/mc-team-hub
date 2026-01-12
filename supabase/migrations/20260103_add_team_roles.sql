-- Add Team Leadership Roles
-- This migration adds role management to the team_pic_mappings table
-- Allows assigning Leader, Manager, or Member roles to each team member

-- 1. Add role column with default value 'member'
ALTER TABLE team_pic_mappings
  ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

-- 2. Add CHECK constraint to validate role values
ALTER TABLE team_pic_mappings
  ADD CONSTRAINT check_valid_role
  CHECK (role IN ('leader', 'manager', 'member'));

-- 3. Add index for filtering by role
CREATE INDEX idx_team_pic_mappings_role
  ON team_pic_mappings(role);

-- 4. Add unique constraint: Only one leader per team
-- Uses partial index to enforce uniqueness only for leader role
CREATE UNIQUE INDEX idx_one_leader_per_team
  ON team_pic_mappings(team_id)
  WHERE role = 'leader';

-- 5. Add unique constraint: Only one manager per team
-- Uses partial index to enforce uniqueness only for manager role
CREATE UNIQUE INDEX idx_one_manager_per_team
  ON team_pic_mappings(team_id)
  WHERE role = 'manager';

-- Note: Existing rows will have role = 'member' by default
-- Team leaders and managers need to be manually assigned after migration
