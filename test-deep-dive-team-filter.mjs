#!/usr/bin/env node

/**
 * Test Deep Dive v2 API with Team Filter
 */

console.log('🧪 Testing Deep Dive v2 API with Team Filter\n')

const testCases = [
  {
    name: 'PID Perspective + Team Filter (WEB_GTI)',
    payload: {
      perspective: 'pid',
      period1: { start: '2025-10-01', end: '2025-10-15' },
      period2: { start: '2025-10-16', end: '2025-10-31' },
      filters: { team: 'WEB_GTI' }
    }
  },
  {
    name: 'PID Perspective + Team Filter (APP)',
    payload: {
      perspective: 'pid',
      period1: { start: '2025-10-01', end: '2025-10-15' },
      period2: { start: '2025-10-16', end: '2025-10-31' },
      filters: { team: 'APP' }
    }
  },
  {
    name: 'MID Perspective + Team Filter (WEB_GV)',
    payload: {
      perspective: 'mid',
      period1: { start: '2025-10-01', end: '2025-10-15' },
      period2: { start: '2025-10-16', end: '2025-10-31' },
      filters: { team: 'WEB_GV' }
    }
  }
]

for (const testCase of testCases) {
  console.log('=' .repeat(80))
  console.log(`📊 ${testCase.name}\n`)

  try {
    const response = await fetch('http://localhost:3000/api/performance-tracker/deep-dive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ HTTP Error:', response.status, response.statusText)
      console.error('Response:', errorText)
      continue
    }

    const result = await response.json()

    if (result.status !== 'ok') {
      console.error('❌ API Error:', result.error)
      continue
    }

    const { summary, data } = result

    console.log('✅ Success!')
    console.log(`\nSummary:`)
    console.log(`  Total Items: ${summary.total_items}`)
    console.log(`  Total Revenue P2: $${summary.total_revenue_p2.toLocaleString()}`)
    console.log(`  Revenue Change: ${summary.revenue_change_pct >= 0 ? '+' : ''}${summary.revenue_change_pct.toFixed(2)}%`)
    console.log(`\nTier Distribution:`)
    console.log(`  Tier A: ${summary.tier_counts.A} items ($${summary.tier_revenue.A.toLocaleString()})`)
    console.log(`  Tier B: ${summary.tier_counts.B} items ($${summary.tier_revenue.B.toLocaleString()})`)
    console.log(`  Tier C: ${summary.tier_counts.C} items ($${summary.tier_revenue.C.toLocaleString()})`)
    console.log(`  NEW: ${summary.tier_counts.NEW} items`)
    console.log(`  LOST: ${summary.tier_counts.LOST} items`)

    // Show top 3 items from Tier A
    const tierA = data.filter(item => item.display_tier === 'A')
    if (tierA.length > 0) {
      console.log(`\nTop Tier A Items:`)
      tierA.slice(0, 3).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.name}`)
        console.log(`     Revenue: $${item.rev_p2.toLocaleString()} (Cumul: ${item.cumulative_revenue_pct.toFixed(1)}%)`)
        if (item.transition_warning) {
          console.log(`     Warning: ${item.transition_warning}`)
        }
      })
    }

    // Check PICs in the result
    const pics = new Set(data.map(item => item.pic).filter(Boolean))
    console.log(`\nPICs in result: ${pics.size}`)
    if (pics.size <= 10) {
      console.log(`  ${Array.from(pics).join(', ')}`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log()
}

console.log('=' .repeat(80))
console.log('✅ All tests complete!')
