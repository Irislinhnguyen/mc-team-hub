/**
 * Test individual perspective queries to see the generated SQL and results
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

async function testPerspectiveWithDates(perspective, period1, period2) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 Testing ${perspective.toUpperCase()} Perspective`)
  console.log('='.repeat(80))
  console.log(`Period 1: ${period1.start} to ${period1.end}`)
  console.log(`Period 2: ${period2.start} to ${period2.end}`)
  console.log()

  const requestBody = {
    perspective,
    period1,
    period2,
    filters: {}
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (data.status === 'error') {
      console.log(`❌ Error: ${data.error}`)
      return
    }

    console.log(`✅ Success!`)
    console.log(`\nSummary:`)
    console.log(`  Total items:       ${data.summary.total_items}`)
    console.log(`  Revenue P1:        $${data.summary.total_revenue_p1.toFixed(2)}`)
    console.log(`  Revenue P2:        $${data.summary.total_revenue_p2.toFixed(2)}`)
    console.log(`  Requests P1:       ${data.summary.total_requests_p1 || 0}`)
    console.log(`  Requests P2:       ${data.summary.total_requests_p2 || 0}`)
    console.log(`  Revenue Change:    ${data.summary.revenue_change_pct.toFixed(2)}%`)

    if (data.summary.tier_counts) {
      console.log(`\nTier Distribution:`)
      Object.entries(data.summary.tier_counts).forEach(([tier, count]) => {
        console.log(`  ${tier}: ${count}`)
      })
    }

    if (data.data && data.data.length > 0) {
      console.log(`\nTop 3 Items:`)
      data.data.slice(0, 3).forEach((item, i) => {
        console.log(`\n  ${i + 1}. ${item.name || item.id}`)
        console.log(`     ID:           ${item.id || item.pic || item.pid}`)
        console.log(`     Revenue P2:   $${item.rev_p2?.toFixed(2) || 0}`)
        console.log(`     Requests P2:  ${item.req_p2 || 0}`)
        console.log(`     Tier:         ${item.tier || 'N/A'}`)
        console.log(`     Status:       ${item.status || 'N/A'}`)
      })
    }

  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`)
  }
}

async function runTests() {
  console.log('🧪 Testing Deep Dive Perspectives with Different Date Ranges\n')

  // Test with recent data that should exist
  const recentDates = [
    {
      label: 'Recent Data (Dec 2024 vs Nov 2024)',
      period1: { start: '2024-11-01', end: '2024-11-30' },
      period2: { start: '2024-12-01', end: '2024-12-31' }
    },
    {
      label: 'Q4 2024 (Oct vs Nov)',
      period1: { start: '2024-10-01', end: '2024-10-31' },
      period2: { start: '2024-11-01', end: '2024-11-30' }
    }
  ]

  const perspectives = ['pic', 'pid', 'mid', 'product', 'zone']

  for (const dateRange of recentDates) {
    console.log(`\n\n${'█'.repeat(80)}`)
    console.log(`📅 ${dateRange.label}`)
    console.log('█'.repeat(80))

    for (const perspective of perspectives) {
      await testPerspectiveWithDates(
        perspective,
        dateRange.period1,
        dateRange.period2
      )

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log('\n\n' + '█'.repeat(80))
  console.log('✨ All tests complete!')
  console.log('█'.repeat(80))
}

runTests()
