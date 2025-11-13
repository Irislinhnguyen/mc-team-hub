/**
 * Test with CORRECT dates from screenshot
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

const testRequest = {
  perspective: 'pid',
  period1: {
    start: '2025-09-01',  // Baseline: Sep 1-15
    end: '2025-09-15'
  },
  period2: {
    start: '2025-09-16',  // Current: Sep 16-30
    end: '2025-09-30'
  },
  filters: {
    team: 'APP'
  },
  simplifiedFilter: {
    includeExclude: 'INCLUDE',
    clauses: [],
    clauseLogic: 'AND'
  }
}

console.log('Testing with CORRECT dates from screenshot:')
console.log('Period 1 (baseline):', testRequest.period1)
console.log('Period 2 (current):', testRequest.period2)
console.log('Team filter: APP')
console.log('\nCalling API...\n')

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testRequest)
})
  .then(res => res.json())
  .then(result => {
    console.log('═══════════════════════════════════════')
    console.log('API RESPONSE')
    console.log('═══════════════════════════════════════')
    console.log('\n📊 Summary:')
    console.log('Total Items:', result.summary.total_items)
    console.log('Total Revenue P1: $' + result.summary.total_revenue_p1.toFixed(2))
    console.log('Total Revenue P2: $' + result.summary.total_revenue_p2.toFixed(2))
    console.log('Revenue Change:', result.summary.revenue_change_pct.toFixed(2) + '%')
    console.log('Total Requests P1:', result.summary.total_requests_p1.toLocaleString())
    console.log('Total Requests P2:', result.summary.total_requests_p2.toLocaleString())
    console.log('Requests Change:', result.summary.requests_change_pct.toFixed(2) + '%')
    console.log('eCPM P1: $' + result.summary.total_ecpm_p1.toFixed(2))
    console.log('eCPM P2: $' + result.summary.total_ecpm_p2.toFixed(2))
    console.log('eCPM Change:', result.summary.ecpm_change_pct.toFixed(2) + '%')

    console.log('\n📈 Tier Distribution:')
    console.log('  Tier A:', result.summary.tier_counts.A, 'items ($' + result.summary.tier_revenue.A.toFixed(2) + ')')
    console.log('  Tier B:', result.summary.tier_counts.B, 'items ($' + result.summary.tier_revenue.B.toFixed(2) + ')')
    console.log('  Tier C:', result.summary.tier_counts.C, 'items ($' + result.summary.tier_revenue.C.toFixed(2) + ')')
    console.log('  NEW:', result.summary.tier_counts.NEW, 'items ($' + result.summary.tier_revenue.NEW.toFixed(2) + ')')
    console.log('  LOST:', result.summary.tier_counts.LOST, 'items ($' + result.summary.tier_revenue.LOST.toFixed(2) + ')')

    console.log('\n═══════════════════════════════════════')
    console.log('COMPARE WITH UI SCREENSHOT')
    console.log('═══════════════════════════════════════')
    console.log('\nUI shows:')
    console.log('  Total Revenue P2: $64')
    console.log('  Total Requests P2: 42,988')
    console.log('  Items: 182 (A:1, B:0, C:181)')
    console.log('  eCPM: $1.49')

    console.log('\nAPI returns:')
    console.log('  Total Revenue P2: $' + result.summary.total_revenue_p2.toFixed(2))
    console.log('  Total Requests P2:', result.summary.total_requests_p2.toLocaleString())
    console.log('  Items:', result.summary.total_items, '(A:' + result.summary.tier_counts.A + ', B:' + result.summary.tier_counts.B + ', C:' + result.summary.tier_counts.C + ')')
    console.log('  eCPM: $' + result.summary.total_ecpm_p2.toFixed(2))

    const revMatch = Math.abs(result.summary.total_revenue_p2 - 64) < 1
    const reqMatch = Math.abs(result.summary.total_requests_p2 - 42988) < 100
    const itemMatch = result.summary.total_items === 182

    console.log('\n' + (revMatch && reqMatch && itemMatch ? '✅ MATCH!' : '❌ MISMATCH!'))

    if (!revMatch || !reqMatch || !itemMatch) {
      console.log('\n⚠️  Data does NOT match UI! Possible issues:')
      console.log('  1. UI is calling API with different parameters')
      console.log('  2. UI is applying client-side filtering')
      console.log('  3. UI cache is stale')
      console.log('  4. Date timezone issues')
    }

    if (result.data && result.data.length > 0) {
      console.log('\n📝 Top 5 Publishers:')
      result.data.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. PID ${item.pid} - ${item.pubname || 'N/A'}`)
        console.log(`   Rev P2: $${item.rev_p2.toFixed(2)} | Tier: ${item.display_tier}`)
      })
    }
  })
  .catch(err => console.error('❌ Error:', err.message))
