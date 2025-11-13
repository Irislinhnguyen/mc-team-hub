/**
 * Test with EXCLUDE filter like the UI is sending
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

// WITHOUT exclude filter
const testWithoutFilter = {
  perspective: 'pid',
  period1: { start: '2025-09-01', end: '2025-09-15' },
  period2: { start: '2025-09-16', end: '2025-09-30' },
  filters: { team: 'APP' },
  simplifiedFilter: {
    includeExclude: 'INCLUDE',
    clauses: [],
    clauseLogic: 'AND'
  }
}

// WITH exclude filter (need to know what's in the clause)
// We'll test with an empty EXCLUDE first to see if that's the issue
const testWithExclude = {
  perspective: 'pid',
  period1: { start: '2025-09-01', end: '2025-09-15' },
  period2: { start: '2025-09-16', end: '2025-09-30' },
  filters: { team: 'APP' },
  simplifiedFilter: {
    includeExclude: 'EXCLUDE',
    clauses: [],  // Empty for now - will update when we know the actual clause
    clauseLogic: 'AND'
  }
}

console.log('Test 1: WITHOUT exclude filter')
console.log('════════════════════════════════════════\n')

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testWithoutFilter)
})
  .then(res => res.json())
  .then(result => {
    console.log('Total Items:', result.summary.total_items)
    console.log('Total Revenue P2: $' + result.summary.total_revenue_p2.toFixed(2))
    console.log('Total Requests P2:', result.summary.total_requests_p2.toLocaleString())

    console.log('\n\nTest 2: WITH EXCLUDE filter (empty clauses)')
    console.log('════════════════════════════════════════\n')

    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testWithExclude)
    })
  })
  .then(res => res.json())
  .then(result => {
    console.log('Total Items:', result.summary.total_items)
    console.log('Total Revenue P2: $' + result.summary.total_revenue_p2.toFixed(2))
    console.log('Total Requests P2:', result.summary.total_requests_p2.toLocaleString())

    console.log('\n\n⚠️  To see what filter is active in the UI:')
    console.log('1. In browser console, expand: clauses: Array(1)')
    console.log('2. Look at the clause object')
    console.log('3. It will show something like:')
    console.log('   {')
    console.log('     field: "pid",')
    console.log('     operator: "IN",')
    console.log('     values: [...]')
    console.log('   }')
    console.log('\n4. Send me that clause object!')
  })
  .catch(err => console.error('Error:', err.message))
