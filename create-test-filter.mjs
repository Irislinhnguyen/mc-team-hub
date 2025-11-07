#!/usr/bin/env node

/**
 * Create a test advanced filter directly in database
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestFilter() {
  console.log('🔍 Finding user admin@geniee.co.jp...\n')

  // Get user ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'admin@geniee.co.jp')
    .single()

  if (userError || !user) {
    console.error('❌ User not found:', userError)
    return
  }

  console.log('✅ Found user:', user.email, '- ID:', user.id)

  // Create test filter with entity operator
  const testFilter = {
    user_id: user.id,
    name: 'Test: ZID has product video',
    description: 'Test entity-level filter created by script',
    page: 'deep-dive',
    filters: {},
    cross_filters: [],
    filter_type: 'advanced',
    simplified_filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [
        {
          id: 'test-1',
          field: 'zid',
          dataType: 'number',
          operator: 'has',
          // Entity operator fields
          attributeField: 'product',
          attributeDataType: 'string',
          condition: 'equals',
          value: 'video',
          enabled: true
        }
      ]
    },
    is_default: false,
    is_shared: false
  }

  console.log('\n📝 Creating test filter...')
  console.log('Filter structure:', JSON.stringify(testFilter.simplified_filter, null, 2))

  const { data: newFilter, error: insertError } = await supabase
    .from('filter_presets')
    .insert(testFilter)
    .select()
    .single()

  if (insertError) {
    console.error('\n❌ Error creating filter:', insertError)
    return
  }

  console.log('\n✅ Filter created successfully!')
  console.log('ID:', newFilter.id)
  console.log('Name:', newFilter.name)
  console.log('Filter Type:', newFilter.filter_type)
  console.log('\nSimplified Filter:')
  console.log(JSON.stringify(newFilter.simplified_filter, null, 2))

  // Verify by querying back
  console.log('\n\n🔍 Verifying - querying advanced filters...')

  const { data: advancedFilters, error: queryError } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('user_id', user.id)
    .eq('page', 'deep-dive')
    .eq('filter_type', 'advanced')

  if (queryError) {
    console.error('❌ Query error:', queryError)
    return
  }

  console.log(`\n✅ Found ${advancedFilters.length} advanced filter(s) for deep-dive page:`)
  advancedFilters.forEach(f => {
    console.log(`  - ${f.name} (created: ${f.created_at})`)
  })

  console.log('\n✨ Done! Now refresh the browser and check Advanced Filters list!')
}

createTestFilter().catch(console.error)
