/**
 * Test script for Team Perspective Filter Fix
 *
 * This script tests that when Team perspective is selected with a team filter,
 * only the selected team's data is returned (not all teams).
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

async function testTeamPerspectiveFilter() {
  console.log('🧪 Testing Team Perspective Filter Fix\n')
  console.log('=' .repeat(60))

  const testPayload = {
    perspective: 'team',
    period1: {
      start: '2025-10-01',
      end: '2025-10-07'
    },
    period2: {
      start: '2025-10-08',
      end: '2025-10-14'
    },
    filters: {
      team: ['WEB_GV'] // Filter by a single team
    }
  }

  console.log('\n📤 Test Request:')
  console.log(JSON.stringify(testPayload, null, 2))

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    if (!response.ok) {
      console.error(`\n❌ HTTP Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Response:', errorText)
      return
    }

    const result = await response.json()

    console.log('\n📥 Response Summary:')
    console.log('Status:', result.status)
    console.log('Total Items:', result.data?.length || 0)

    if (result.data && result.data.length > 0) {
      console.log('\n📊 Teams Returned:')
      result.data.forEach((team, index) => {
        console.log(`  ${index + 1}. ${team.name} (ID: ${team.id})`)
        console.log(`     - Revenue P2: $${team.rev_p2?.toFixed(2) || 0}`)
        console.log(`     - Tier: ${team.tier || team.revenue_tier}`)
        console.log(`     - Status: ${team.status}`)
      })
    }

    console.log('\n' + '='.repeat(60))

    // Validation
    console.log('\n✅ Validation:')

    if (result.status === 'ok') {
      console.log('  ✓ API call successful')
    } else {
      console.log('  ✗ API call failed')
      return
    }

    if (result.data && result.data.length === 1) {
      console.log('  ✓ Only 1 team returned (CORRECT)')
    } else {
      console.log(`  ✗ Expected 1 team, got ${result.data?.length || 0} (BUG NOT FIXED)`)
    }

    if (result.data && result.data.length > 0) {
      const teamId = result.data[0].id?.toLowerCase()
      const teamName = result.data[0].name?.toLowerCase()

      if (teamId === 'outstream' || teamName?.includes('outstream')) {
        console.log('  ✓ Returned team matches filter (outstream)')
      } else {
        console.log(`  ✗ Returned team does not match filter (got: ${teamName || teamId})`)
      }
    }

    console.log('\n' + '='.repeat(60))

    if (result.data && result.data.length === 1 &&
        (result.data[0].id?.toLowerCase() === 'outstream' ||
         result.data[0].name?.toLowerCase().includes('outstream'))) {
      console.log('\n🎉 SUCCESS: Team perspective filter is working correctly!')
    } else {
      console.log('\n⚠️  FAILED: Team perspective filter is not working as expected')
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.message)
    console.error('\nMake sure the dev server is running: npm run dev')
  }
}

// Run the test
testTeamPerspectiveFilter()
