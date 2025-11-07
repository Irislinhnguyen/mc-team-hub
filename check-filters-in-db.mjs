#!/usr/bin/env node

/**
 * Check filters in Supabase database
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFilters() {
  console.log('🔍 Checking filter_presets table...\n')

  // Get all filters
  const { data: filters, error } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('filter_type', 'advanced')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error querying database:', error)
    return
  }

  console.log(`📊 Found ${filters?.length || 0} advanced filters\n`)

  if (filters && filters.length > 0) {
    filters.forEach((filter, idx) => {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`Filter #${idx + 1}`)
      console.log(`${'='.repeat(80)}`)
      console.log(`ID: ${filter.id}`)
      console.log(`Name: ${filter.name}`)
      console.log(`User: ${filter.user_id}`)
      console.log(`Page: ${filter.page}`)
      console.log(`Created: ${filter.created_at}`)
      console.log(`\nFilter Config:`)
      console.log(JSON.stringify(filter.config, null, 2))
    })
  } else {
    console.log('⚠️  No advanced filters found in database')
    console.log('\nPossible reasons:')
    console.log('1. Filter not saved yet')
    console.log('2. Saved as standard filter instead of advanced')
    console.log('3. Database connection issue')
    console.log('4. User not authenticated correctly')
  }

  // Check all filters (not just advanced)
  console.log('\n\n🔍 Checking ALL filters (including standard)...\n')

  const { data: allFilters, error: allError } = await supabase
    .from('filter_presets')
    .select('id, name, page, filter_type, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (allError) {
    console.error('❌ Error:', allError)
  } else {
    console.log(`Total recent filters: ${allFilters?.length || 0}`)
    if (allFilters && allFilters.length > 0) {
      console.log('\nRecent filters:')
      allFilters.forEach(f => {
        console.log(`  - ${f.name} (${f.filter_type}) - ${f.page} - ${f.created_at}`)
      })
    }
  }
}

checkFilters().catch(console.error)
