/**
 * Test Team-Pics API Endpoint
 * Test the actual API response to debug the issue
 */

async function testTeamPicsAPI() {
  const baseUrl = 'http://localhost:3000'
  const teamId = 'WEB_GV'

  console.log('Testing team-pics API endpoint')
  console.log('====================================\n')

  // Test 1: Call team-pics API directly
  console.log('Test 1: GET /api/focus-of-month/metadata/team-pics?team=WEB_GV')
  console.log('---------------------------------------------------------------')

  try {
    const response = await fetch(`${baseUrl}/api/focus-of-month/metadata/team-pics?team=${teamId}`)
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log('Response body:', JSON.stringify(data, null, 2))
    console.log('')

    // Check if PICs include vn_anhtn
    if (data.status === 'ok' && data.data) {
      console.log('PICs returned:', data.data)
      console.log('Has vn_anhtn?', data.data.includes('vn_anhtn'))
      console.log('Has VN_anhtn?', data.data.includes('VN_anhtn'))
      console.log('')

      // Check PIC names format
      console.log('PIC name formats:')
      data.data.forEach(pic => {
        console.log(`  - ${pic}: starts with vn_? ${pic.startsWith('vn_')}, starts with VN_? ${pic.startsWith('VN_')}`)
      })
    }
  } catch (error) {
    console.error('Error:', error.message)
  }

  console.log('\n')

  // Test 2: Check teams metadata API
  console.log('Test 2: GET /api/focus-of-month/metadata/teams')
  console.log('------------------------------------------------')

  try {
    const response = await fetch(`${baseUrl}/api/focus-of-month/metadata/teams`)
    console.log('Response status:', response.status)

    const data = await response.json()
    console.log('Response body:', JSON.stringify(data, null, 2))

    if (data.status === 'ok' && data.data) {
      console.log('\nTeam options:')
      data.data.forEach(team => {
        console.log(`  - label: "${team.label}", value: "${team.value}"`)
      })
    }
  } catch (error) {
    console.error('Error:', error.message)
  }

  console.log('\n')

  // Test 3: Query Supabase directly
  console.log('Test 3: Check Supabase team_pic_mappings table')
  console.log('------------------------------------------------')

  // Read .env.local to get Supabase credentials
  const fs = await import('fs')
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const { data: mappings, error } = await supabase
    .from('team_pic_mappings')
    .select('*')
    .order('pic_name')

  if (error) {
    console.error('Error querying Supabase:', error)
  } else {
    console.log('Total mappings:', mappings.length)

    // Check vn_anhtn
    const vn_anhtn = mappings.find(m => m.pic_name === 'vn_anhtn' || m.pic_name === 'VN_anhtn')
    if (vn_anhtn) {
      console.log('Found vn_anhtn/VN_anhtn:', vn_anhtn)
    } else {
      console.log('vn_anhtn NOT FOUND in team_pic_mappings')
    }

    // Show WEB_GV PICs
    const webGVPics = mappings.filter(m => m.team_id === 'WEB_GV')
    console.log('\nWEB_GV PICs from Supabase:')
    webGVPics.forEach(m => {
      console.log(`  - ${m.pic_name} (team_id: ${m.team_id})`)
    })

    // Show APP PICs
    const appPics = mappings.filter(m => m.team_id === 'APP')
    console.log('\nAPP PICs from Supabase:')
    appPics.forEach(m => {
      console.log(`  - ${m.pic_name} (team_id: ${m.team_id})`)
    })
  }
}

testTeamPicsAPI().catch(console.error)
