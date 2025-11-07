#!/usr/bin/env node

/**
 * Run migration to add simplified_filter column
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  console.log('📦 Running migration: add simplified_filter column\n')

  const sql = `
    -- Add simplified_filter column to filter_presets table
    ALTER TABLE filter_presets
    ADD COLUMN IF NOT EXISTS simplified_filter JSONB DEFAULT NULL;

    -- Add comment
    COMMENT ON COLUMN filter_presets.simplified_filter IS 'Stores SimplifiedFilter structure for advanced filters';
  `

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Migration failed:', error)
      console.log('\n⚠️  Trying alternative method...')

      // Alternative: Use direct query
      const { error: altError } = await supabase
        .from('filter_presets')
        .select('id')
        .limit(0) // Just to test connection

      if (altError) {
        console.error('Connection test failed:', altError)
      }

      console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:')
      console.log('=' .repeat(80))
      console.log(sql)
      console.log('=' .repeat(80))
      return
    }

    console.log('✅ Migration completed successfully!')
  } catch (err) {
    console.error('❌ Error:', err)
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:')
    console.log('=' .repeat(80))
    console.log(sql)
    console.log('=' .repeat(80))
  }
}

runMigration()
