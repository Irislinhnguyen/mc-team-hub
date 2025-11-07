#!/usr/bin/env node

/**
 * Seed additional test filters to database
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedFilters() {
  console.log('🌱 Seeding additional test filters...\n')

  const userId = '0fc1bff7-7f99-49c5-90d3-24f5c5412ac6'  // admin@geniee.co.jp

  // Filter 1: Revenue tier filter (direct condition)
  const filter1 = {
    user_id: userId,
    name: 'High Revenue Publishers',
    description: 'Publishers with revenue tier >10000',
    page: 'deep-dive',
    filters: {},
    cross_filters: [],
    simplified_filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [
        {
          id: 'clause-1',
          field: 'revenue_tier',
          dataType: 'string',
          operator: 'equals',
          value: '>10000',
          enabled: true
        }
      ]
    },
    filter_type: 'advanced',
    is_default: false,
    is_shared: false
  }

  // Filter 2: Product + PIC combination
  const filter2 = {
    user_id: userId,
    name: 'Video Product - CS Team',
    description: 'Video products handled by CS team',
    page: 'deep-dive',
    filters: {},
    cross_filters: [],
    simplified_filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [
        {
          id: 'clause-1',
          field: 'product',
          dataType: 'string',
          operator: 'equals',
          value: 'video',
          enabled: true
        },
        {
          id: 'clause-2',
          field: 'team',
          dataType: 'string',
          operator: 'equals',
          value: 'CS',
          enabled: true
        }
      ]
    },
    filter_type: 'advanced',
    is_default: false,
    is_shared: false
  }

  // Filter 3: Entity operator example - MIDs with standardbanner
  const filter3 = {
    user_id: userId,
    name: 'MIDs using StandardBanner',
    description: 'Media IDs that have standardbanner product',
    page: 'deep-dive',
    filters: {},
    cross_filters: [],
    simplified_filter: {
      includeExclude: 'INCLUDE',
      clauseLogic: 'AND',
      clauses: [
        {
          id: 'clause-1',
          field: 'mid',
          dataType: 'number',
          operator: 'has',
          attributeField: 'product',
          attributeDataType: 'string',
          condition: 'equals',
          value: 'standardbanner',
          enabled: true
        }
      ]
    },
    filter_type: 'advanced',
    is_default: false,
    is_shared: false
  }

  try {
    // Insert filter 1
    console.log('📝 Creating filter: "High Revenue Publishers"...')
    const { data: f1, error: e1 } = await supabase
      .from('filter_presets')
      .insert(filter1)
      .select()
      .single()

    if (e1) {
      console.error('❌ Failed to create filter 1:', e1.message)
    } else {
      console.log('✅ Filter 1 created:', f1.name)
    }

    // Insert filter 2
    console.log('📝 Creating filter: "Video Product - CS Team"...')
    const { data: f2, error: e2 } = await supabase
      .from('filter_presets')
      .insert(filter2)
      .select()
      .single()

    if (e2) {
      console.error('❌ Failed to create filter 2:', e2.message)
    } else {
      console.log('✅ Filter 2 created:', f2.name)
    }

    // Insert filter 3
    console.log('📝 Creating filter: "MIDs using StandardBanner"...')
    const { data: f3, error: e3 } = await supabase
      .from('filter_presets')
      .insert(filter3)
      .select()
      .single()

    if (e3) {
      console.error('❌ Failed to create filter 3:', e3.message)
    } else {
      console.log('✅ Filter 3 created:', f3.name)
    }

    console.log('\n🎉 Seeding completed!')
    console.log('\nNow you have multiple filters to test multi-select:')
    console.log('1. High Revenue Publishers (revenue_tier = >10000)')
    console.log('2. Video Product - CS Team (product=video AND team=CS)')
    console.log('3. MIDs using StandardBanner (mid has product equals standardbanner)')
    console.log('\nTry selecting multiple filters and see them merge with AND logic!')

  } catch (error) {
    console.error('❌ Error seeding filters:', error)
  }
}

seedFilters()
