/**
 * Test Deep Dive API WITHOUT team filter
 * to see if there's any data at all
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

// NO FILTERS - just get all publishers
const testRequest = {
  perspective: 'pid',
  period1: {
    start: '2025-09-17',
    end: '2025-10-14'
  },
  period2: {
    start: '2025-10-15',
    end: '2025-11-11'
  },
  filters: {}, // NO FILTERS
  simplifiedFilter: {
    includeExclude: 'INCLUDE',
    clauses: [],
    clauseLogic: 'AND'
  }
}

console.log('Testing API WITHOUT filters...\n')

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testRequest)
})
  .then(res => res.json())
  .then(result => {
    console.log('Total Items:', result.summary.total_items)
    console.log('Total Revenue P2:', result.summary.total_revenue_p2)
    console.log('Total Requests P2:', result.summary.total_requests_p2)

    if (result.data && result.data.length > 0) {
      console.log('\n✅ Data exists! Top 5 publishers:')
      result.data.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. PID ${item.pid} - Rev P2: $${item.rev_p2.toFixed(2)} - Req P2: ${item.req_p2}`)
      })

      // Check if any have 'team' field
      const hasTeam = result.data.some(item => item.team)
      console.log('\n🔍 Checking if results have "team" field:', hasTeam)
      if (hasTeam) {
        const teams = [...new Set(result.data.map(item => item.team).filter(Boolean))]
        console.log('Available teams:', teams)
      }
    } else {
      console.log('\n❌ NO DATA FOUND for these dates!')
      console.log('This means either:')
      console.log('1. The date range has no data in BigQuery')
      console.log('2. The BigQuery table name is wrong')
      console.log('3. There is a connection issue to BigQuery')
    }
  })
  .catch(err => {
    console.error('❌ ERROR:', err.message)
  })
