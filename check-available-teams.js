/**
 * Check what teams are available in Supabase
 */

async function checkTeams() {
  try {
    // Import the team matcher utility
    const module = await import('./lib/utils/teamMatcher.js')
    const { getTeamsWithPics } = module

    console.log('📋 Fetching teams from Supabase...\n')

    const teamsWithPics = await getTeamsWithPics()

    console.log(`✅ Found ${teamsWithPics.length} teams:\n`)

    teamsWithPics.forEach(({ team, pics }) => {
      console.log(`Team ID: ${team.team_id}`)
      console.log(`Team Name: ${team.team_name}`)
      console.log(`PICs (${pics.length}): ${pics.join(', ')}`)
      console.log('─'.repeat(60))
    })

    console.log('\n🔍 Looking for team "App"...')
    const appTeam = teamsWithPics.find(({ team }) => team.team_id === 'App')
    if (appTeam) {
      console.log('✅ Found team "App":')
      console.log('   PICs:', appTeam.pics)
    } else {
      console.log('❌ Team "App" NOT FOUND!')
      console.log('   Available team IDs:', teamsWithPics.map(({ team }) => team.team_id).join(', '))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

checkTeams()
