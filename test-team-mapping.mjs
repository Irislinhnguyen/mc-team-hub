#!/usr/bin/env node

/**
 * Test Team Mapping from Supabase
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Testing Team Mapping from Supabase\n')
console.log('Config:')
console.log('  Supabase URL:', supabaseUrl ? '✓' : '✗')
console.log('  Service Key:', supabaseServiceKey ? '✓' : '✗')
console.log()

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test 1: Fetch team_configurations
console.log('📊 Test 1: Fetching team_configurations...')
const { data: teams, error: teamsError } = await supabase
  .from('team_configurations')
  .select('*')
  .order('display_order')

if (teamsError) {
  console.error('❌ Error:', teamsError.message)
} else {
  console.log(`✅ Found ${teams.length} teams:`)
  teams.forEach(team => {
    console.log(`  - ${team.team_id}: ${team.team_name}`)
  })
}
console.log()

// Test 2: Fetch team_pic_mappings
console.log('📊 Test 2: Fetching team_pic_mappings...')
const { data: mappings, error: mappingsError } = await supabase
  .from('team_pic_mappings')
  .select('*')

if (mappingsError) {
  console.error('❌ Error:', mappingsError.message)
} else {
  console.log(`✅ Found ${mappings.length} PIC mappings:`)

  // Group by team
  const byTeam = mappings.reduce((acc, m) => {
    if (!acc[m.team_id]) acc[m.team_id] = []
    acc[m.team_id].push(m.pic_name)
    return acc
  }, {})

  Object.entries(byTeam).forEach(([teamId, pics]) => {
    const team = teams?.find(t => t.team_id === teamId)
    console.log(`  ${teamId} (${team?.team_name || 'Unknown'}): ${pics.length} PICs`)
    pics.forEach(pic => console.log(`    - ${pic}`))
  })
}
console.log()

// Test 3: Test buildTeamCondition logic
console.log('📊 Test 3: Building SQL WHERE condition for team filter...')
if (teams && teams.length > 0 && mappings && mappings.length > 0) {
  const firstTeam = teams[0]
  const teamPics = mappings
    .filter(m => m.team_id === firstTeam.team_id)
    .map(m => m.pic_name)

  if (teamPics.length > 0) {
    const picValues = teamPics.map(pic => `'${pic}'`).join(', ')
    const sqlCondition = `pic IN (${picValues})`

    console.log(`✅ SQL for team "${firstTeam.team_id}":`)
    console.log(`  ${sqlCondition}`)
  } else {
    console.log(`⚠️ No PICs assigned to team "${firstTeam.team_id}"`)
  }
} else {
  console.log('⚠️ No teams or mappings found')
}
console.log()

console.log('✅ Test complete!')
