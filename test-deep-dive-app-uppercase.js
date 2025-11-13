/**
 * Test with correct team_id = "APP" (uppercase)
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

const testRequest = {
  perspective: 'pid',
  period1: { start: '2025-09-17', end: '2025-10-14' },
  period2: { start: '2025-10-15', end: '2025-11-11' },
  filters: {
    team: 'APP' // UPPERCASE
  },
  simplifiedFilter: {
    includeExclude: 'INCLUDE',
    clauses: [],
    clauseLogic: 'AND'
  }
}

console.log('Testing with team = "APP" (uppercase)...\n')

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testRequest)
})
  .then(res => res.json())
  .then(result => {
    console.log('Total Items:', result.summary.total_items)
    console.log('Total Revenue P2: $' + result.summary.total_revenue_p2.toFixed(2))
    console.log('Total Requests P2:', result.summary.total_requests_p2.toLocaleString())
    console.log('\nTier Distribution:')
    console.log('  Tier A:', result.summary.tier_counts.A, 'items')
    console.log('  Tier B:', result.summary.tier_counts.B, 'items')
    console.log('  Tier C:', result.summary.tier_counts.C, 'items')
    console.log('  NEW:', result.summary.tier_counts.NEW, 'items')
    console.log('  LOST:', result.summary.tier_counts.LOST, 'items')

    if (result.data && result.data.length > 0) {
      console.log('\n✅ SUCCESS! Top 5 publishers for APP team:')
      result.data.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. PID ${item.pid} - ${item.pubname || 'N/A'}`)
        console.log(`   Rev P2: $${item.rev_p2.toFixed(2)} | Tier: ${item.display_tier}`)
      })
    } else {
      console.log('\n❌ Still no data!')
    }
  })
  .catch(err => console.error('Error:', err.message))
