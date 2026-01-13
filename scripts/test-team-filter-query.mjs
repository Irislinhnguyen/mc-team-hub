/**
 * Test Team Filter SQL Query
 * Check what PICs belong to WEB_GV team and test SQL filtering
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function main() {
  console.log('=================================')
  console.log('Team Filter SQL Test')
  console.log('=================================\n')

  // Step 1: Get PIC mappings from Supabase
  console.log('Step 1: Get PIC mappings from Supabase')
  console.log('------------------------------------------')

  const { data: picMappings, error } = await supabase
    .from('team_pic_mappings')
    .select('team_id, pic_name')
    .order('pic_name')

  if (error) {
    console.error('Error fetching PIC mappings:', error)
    process.exit(1)
  }

  console.log('Total PIC mappings:', picMappings.length)

  // Show unique teams
  const uniqueTeams = [...new Set(picMappings.map(m => m.team_id))]
  console.log('Available teams:', uniqueTeams.join(', '))
  console.log('')

  // Step 2: Get PICs for WEB_GV team
  console.log('Step 2: Get PICs for WEB_GV team')
  console.log('------------------------------------------')
  const webGVPics = picMappings
    .filter(m => m.team_id === 'WEB_GV')
    .map(m => m.pic_name)

  console.log('WEB_GV PICs:', webGVPics)
  console.log('Total WEB_GV PICs:', webGVPics.length)
  console.log('')

  // Step 3: Check if vn_anhtn is in WEB_GV
  console.log('Step 3: Check vn_anhtn team')
  console.log('------------------------------------------')
  const vn_anhtn_Mapping = picMappings.find(m => m.pic_name === 'vn_anhtn')
  if (vn_anhtn_Mapping) {
    console.log('✅ vn_anhtn found in team:', vn_anhtn_Mapping.team_id)
    if (vn_anhtn_Mapping.team_id === 'WEB_GV') {
      console.log('⚠️  vn_anhtn IS in WEB_GV team - this explains why it appears in results!')
    } else {
      console.log('❌ vn_anhtn is in', vn_anhtn_Mapping.team_id, 'team, NOT WEB_GV')
    }
  } else {
    console.log('❌ vn_anhtn NOT FOUND in pic_mappings!')
  }
  console.log('')

  // Step 4: Show all teams with their PICs
  console.log('Step 4: Team breakdown')
  console.log('------------------------------------------')
  uniqueTeams.forEach(teamId => {
    const teamPics = picMappings
      .filter(m => m.team_id === teamId)
      .map(m => m.pic_name)

    console.log(`${teamId}:`, teamPics.length, 'PICs')
    if (teamId === 'WEB_GV' || teamId === 'APP') {
      console.log('  →', teamPics.join(', '))
    }
  })
  console.log('')

  // Step 5: Generate the SQL that would be executed
  console.log('Step 5: SQL Query that gets executed')
  console.log('------------------------------------------')

  const picList = webGVPics.map(p => `'${p}'`).join(', ')
  console.log('PIC filter for SQL: pic IN (' + picList + ')')
  console.log('')

  const sql = `
-- Query when filtering for WEB_GV team + flexiblesticky product
SELECT
  pic,
  medianame,
  product,
  SUM(rev) as total_rev,
  COUNT(DISTINCT mid) as unique_mids
FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
WHERE DATE BETWEEN '2024-12-14' AND '2025-01-13'
  AND product = 'flexiblesticky'
  AND mid NOT IN (
    SELECT DISTINCT mid
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE product = 'flexiblesticky'
      AND DATE BETWEEN '2024-12-14' AND '2025-01-13'
  )
  AND pic IN (${picList})
GROUP BY pic, medianame, product
ORDER BY total_rev DESC
LIMIT 20
  `

  console.log('SQL Query:')
  console.log(sql)
  console.log('')

  // Step 6: Explain the default condition
  console.log('Step 6: Understanding the default condition')
  console.log('------------------------------------------')
  console.log('The query has 2 main parts:')
  console.log('1. mid NOT IN (SELECT mid WHERE product = "flexiblesticky")')
  console.log('   → Excludes MIDs that already HAVE flexiblesticky')
  console.log('   → Only shows MIDs WITHOUT flexiblesticky')
  console.log('')
  console.log('2. pic IN (WEB_GV_PICs)')
  console.log('   → Only shows media for PICs in WEB_GV team')
  console.log('')
  console.log('CONCLUSION:')
  console.log('If vn_anhtn appears in results, it means:')
  console.log('  - vn_anhtn IS in WEB_GV team')
  console.log('  - And there are MIDs with vn_anhtn that DONT have flexiblesticky')
  console.log('')
  console.log('If vn_anhtn should NOT appear:')
  console.log('  - Check team_pic_mappings table to confirm vn_anhtn team')
  console.log('  - OR check if PIC filter is being applied correctly')
}

main().catch(console.error)
