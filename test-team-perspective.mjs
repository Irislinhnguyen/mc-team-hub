#!/usr/bin/env node

/**
 * Test Team Perspective (GROUP BY team via aggregation)
 */

console.log('🧪 Testing Team Perspective\n')
console.log('This tests the workaround for BigQuery table not having team column')
console.log('We fetch PIC data and aggregate by team in API layer\n')

const payload = {
  perspective: 'team',
  period1: { start: '2025-10-01', end: '2025-10-15' },
  period2: { start: '2025-10-16', end: '2025-10-31' },
  filters: {}
}

console.log('Request:', JSON.stringify(payload, null, 2))
console.log()

try {
  const response = await fetch('http://localhost:3000/api/performance-tracker/deep-dive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ HTTP Error:', response.status, response.statusText)
    console.error('Response:', errorText)
    process.exit(1)
  }

  const result = await response.json()

  if (result.status !== 'ok') {
    console.error('❌ API Error:', result.error)
    process.exit(1)
  }

  const { summary, data } = result

  console.log('=' .repeat(80))
  console.log('✅ SUCCESS - Team Perspective Working!\n')

  console.log('📊 Summary:')
  console.log(`  Total Teams: ${summary.total_items}`)
  console.log(`  Total Revenue P1: $${summary.total_revenue_p1.toLocaleString()}`)
  console.log(`  Total Revenue P2: $${summary.total_revenue_p2.toLocaleString()}`)
  console.log(`  Revenue Change: ${summary.revenue_change_pct >= 0 ? '+' : ''}${summary.revenue_change_pct.toFixed(2)}%`)
  console.log()

  console.log('🏆 Tier Distribution:')
  console.log(`  Tier A: ${summary.tier_counts.A} teams ($${summary.tier_revenue.A.toLocaleString()})`)
  console.log(`  Tier B: ${summary.tier_counts.B} teams ($${summary.tier_revenue.B.toLocaleString()})`)
  console.log(`  Tier C: ${summary.tier_counts.C} teams ($${summary.tier_revenue.C.toLocaleString()})`)
  console.log(`  NEW: ${summary.tier_counts.NEW} teams`)
  console.log(`  LOST: ${summary.tier_counts.LOST} teams`)
  console.log()

  console.log('=' .repeat(80))
  console.log('📋 Team Details:\n')

  // Group teams by tier
  const tierA = data.filter(t => t.display_tier === 'A')
  const tierB = data.filter(t => t.display_tier === 'B')
  const tierC = data.filter(t => t.display_tier === 'C')

  if (tierA.length > 0) {
    console.log('🥇 TIER A Teams:')
    tierA.forEach(team => {
      console.log(`  • ${team.name} (${team.id})`)
      console.log(`    Revenue P2: $${team.rev_p2.toLocaleString()} (${(team.rev_p2/summary.total_revenue_p2*100).toFixed(1)}% of total)`)
      console.log(`    Cumulative: ${team.cumulative_revenue_pct.toFixed(1)}%`)
      console.log(`    PICs: ${team.pic_count}`)
      console.log(`    Change: ${team.rev_change_pct >= 0 ? '+' : ''}${team.rev_change_pct.toFixed(1)}%`)
      console.log(`    Fill Rate: ${team.fill_rate_p2.toFixed(1)}%`)
      if (team.transition_warning) {
        console.log(`    ⚠️  ${team.transition_warning}`)
      }
      console.log()
    })
  }

  if (tierB.length > 0) {
    console.log('🥈 TIER B Teams:')
    tierB.forEach(team => {
      console.log(`  • ${team.name} (${team.id})`)
      console.log(`    Revenue P2: $${team.rev_p2.toLocaleString()}`)
      console.log(`    Cumulative: ${team.cumulative_revenue_pct.toFixed(1)}%`)
      console.log(`    PICs: ${team.pic_count}`)
      console.log(`    Change: ${team.rev_change_pct >= 0 ? '+' : ''}${team.rev_change_pct.toFixed(1)}%`)
      if (team.transition_warning) {
        console.log(`    ⚠️  ${team.transition_warning}`)
      }
      console.log()
    })
  }

  if (tierC.length > 0) {
    console.log('🥉 TIER C Teams:')
    tierC.forEach(team => {
      console.log(`  • ${team.name} (${team.id})`)
      console.log(`    Revenue P2: $${team.rev_p2.toLocaleString()}`)
      console.log(`    Cumulative: ${team.cumulative_revenue_pct.toFixed(1)}%`)
      console.log(`    PICs: ${team.pic_count}`)
      console.log(`    Change: ${team.rev_change_pct >= 0 ? '+' : ''}${team.rev_change_pct.toFixed(1)}%`)
      console.log()
    })
  }

  console.log('=' .repeat(80))
  console.log('\n💡 Insights:')
  console.log(`  • Team Perspective working via PIC aggregation`)
  console.log(`  • ${summary.total_items} teams analyzed`)
  console.log(`  • Top team contributes ${tierA.length > 0 ? (tierA[0].rev_p2/summary.total_revenue_p2*100).toFixed(1) : 0}% of total revenue`)
  console.log(`  • Revenue distribution: A(${summary.tier_counts.A}), B(${summary.tier_counts.B}), C(${summary.tier_counts.C})`)

  console.log('\n✅ Test complete!')

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
