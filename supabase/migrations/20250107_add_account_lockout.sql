-- Add account lockout columns to users table
-- For preventing brute force attacks

ALTER TABLE users
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Create index for faster lockout checks
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);

-- Add comment to explain the fields
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which the account is locked';
