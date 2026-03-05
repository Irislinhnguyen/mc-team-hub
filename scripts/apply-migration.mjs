import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function applyMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260304_create_upsert_pipelines_batch_function.sql')

  console.log('🚀 Applying pipeline batch upsert migration...\n')
  console.log('Migration file:', migrationPath)

  // Check if file exists
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    return
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log('SQL length:', migrationSQL.length, 'characters\n')

  try {
    // Execute the migration SQL directly
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    })

    if (error) {
      // If exec_sql doesn't exist, try using the raw SQL approach
      console.log('⚠️  exec_sql RPC not available, trying direct SQL execution...')

      // For this migration, we'll just display instructions
      console.log('\n⚠️  Manual migration required!')
      console.log('\nPlease run this migration manually in Supabase SQL Editor:')
      console.log('1. Go to https://supabase.com/dashboard')
      console.log('2. Navigate to your project')
      console.log('3. Click on "SQL Editor" in the left sidebar')
      console.log('4. Click "New Query"')
      console.log('5. Copy and paste the contents of:')
      console.log('   ' + migrationPath)
      console.log('6. Click "Run" to execute the migration\n')
    } else {
      console.log('✅ Migration applied successfully!')
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n⚠️  Manual migration required!')
    console.log('\nPlease run this migration manually in Supabase SQL Editor:')
    console.log('1. Go to https://supabase.com/dashboard')
    console.log('2. Navigate to your project')
    console.log('3. Click on "SQL Editor" in the left sidebar')
    console.log('4. Click "New Query"')
    console.log('5. Copy and paste the contents of:')
    console.log('   ' + migrationPath)
    console.log('6. Click "Run" to execute the migration\n')
  }
}

applyMigration().catch(console.error)