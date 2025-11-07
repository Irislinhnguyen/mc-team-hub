/**
 * Run Supabase Migration
 * Execute the team management migration SQL
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Read migration SQL
const migrationPath = path.join(__dirname, '../supabase/migrations/20250130_create_team_management.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

console.log('🚀 Running team management migration...\n')
console.log('Migration file:', migrationPath)
console.log('SQL length:', migrationSQL.length, 'characters\n')

// Execute migration
try {
  // Note: Supabase JS client doesn't support executing raw SQL directly
  // We need to use the REST API or split into individual statements

  console.log('⚠️  Manual migration required!')
  console.log('\nPlease run this migration manually:')
  console.log('1. Go to your Supabase Dashboard: https://app.supabase.com')
  console.log('2. Navigate to: Project > SQL Editor')
  console.log('3. Copy and paste the SQL from:')
  console.log('   supabase/migrations/20250130_create_team_management.sql')
  console.log('4. Click "Run" to execute the migration')
  console.log('\nOr use the Supabase CLI:')
  console.log('   supabase db push')
  console.log('\nOr use psql directly:')
  console.log('   psql -h db.lvzzmcwsrmpzkdpkllnu.supabase.co -U postgres -d postgres < supabase/migrations/20250130_create_team_management.sql')

} catch (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
}
