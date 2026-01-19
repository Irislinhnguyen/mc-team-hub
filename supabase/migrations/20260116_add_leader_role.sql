-- =====================================================
-- Add 'leader' role to users table
-- =====================================================

-- Drop existing role constraint if it exists
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with leader role included
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'leader', 'user'));

-- Update column comment
COMMENT ON COLUMN users.role IS 'User role: admin (full system access), manager (team management + leader permissions), leader (focus management + can assign user roles), user (read-only)';

-- Verify the change
-- SELECT role, COUNT(*) FROM users GROUP BY role;
