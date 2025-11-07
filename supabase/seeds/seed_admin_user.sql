-- Seed admin user for development/testing
-- Password will be hashed by the application during first run
-- Default password: admin123 (CHANGE THIS IN PRODUCTION!)

-- Note: This is a placeholder. The actual admin user should be created via API
-- or a Node.js script that properly hashes the password with bcrypt.
--
-- To create admin user, run the seed script:
-- node supabase/seeds/seed-admin.mjs

-- This SQL file is just for documentation and manual seeding if needed
-- The password_hash below is bcrypt hash of "admin123" with salt rounds 10
-- Generated with: await bcrypt.hash('admin123', 10)

INSERT INTO users (email, password_hash, name, role, auth_method)
VALUES (
  'admin@geniee.co.jp',
  '$2b$10$rZ5q8P7zN0YxGVm9FQXxYeK3.h3JYJ4vQn3fH5Kq7L2X8vW9NmZaS', -- bcrypt hash of "admin123"
  'System Administrator',
  'admin',
  'password'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  auth_method = EXCLUDED.auth_method,
  updated_at = NOW();

-- Insert additional test users (optional, for development)
INSERT INTO users (email, name, role, auth_method)
VALUES
  ('test.user@geniee.co.jp', 'Test User', 'user', 'google'),
  ('test.manager@geniee.co.jp', 'Test Manager', 'manager', 'google')
ON CONFLICT (email) DO NOTHING;
