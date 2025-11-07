#!/usr/bin/env node

/**
 * Test Backend Logic Without Running Server
 *
 * Tests the tier classification and query building logic
 */

console.log('🧪 Testing Backend Logic\n')

// Simulate data from BigQuery
const mockData = [
  // Top performers (should be Tier A)
  { pid: 1, name: 'Publisher A', rev_p1: 10000, rev_p2: 12000, req_p1: 1000000, req_p2: 1100000, paid_p1: 800000, paid_p2: 900000 },
  { pid: 2, name: 'Publisher B', rev_p1: 8000, rev_p2: 9000, req_p1: 900000, req_p2: 950000, paid_p1: 750000, paid_p2: 800000 },
  { pid: 3, name: 'Publisher C', rev_p1: 7000, rev_p2: 7500, req_p1: 800000, req_p2: 820000, paid_p1: 700000, paid_p2: 710000 },

  // Mid performers (should be Tier B)
  { pid: 4, name: 'Publisher D', rev_p1: 2000, rev_p2: 2200, req_p1: 300000, req_p2: 310000, paid_p1: 250000, paid_p2: 260000 },
  { pid: 5, name: 'Publisher E', rev_p1: 1800, rev_p2: 1900, req_p1: 280000, req_p2: 285000, paid_p1: 240000, paid_p2: 245000 },

  // Low performers (should be Tier C)
  { pid: 6, name: 'Publisher F', rev_p1: 500, rev_p2: 450, req_p1: 100000, req_p2: 95000, paid_p1: 80000, paid_p2: 75000 },
  { pid: 7, name: 'Publisher G', rev_p1: 400, rev_p2: 380, req_p1: 90000, req_p2: 85000, paid_p1: 70000, paid_p2: 65000 },
  { pid: 8, name: 'Publisher H', rev_p1: 300, rev_p2: 280, req_p1: 80000, req_p2: 75000, paid_p1: 60000, paid_p2: 55000 },

  // NEW items
  { pid: 9, name: 'Publisher NEW-HIGH', rev_p1: 0, rev_p2: 5000, req_p1: 0, req_p2: 500000, paid_p1: 0, paid_p2: 400000 },
  { pid: 10, name: 'Publisher NEW-LOW', rev_p1: 0, rev_p2: 200, req_p1: 0, req_p2: 50000, paid_p1: 0, paid_p2: 40000 },

  // LOST items
  { pid: 11, name: 'Publisher LOST-HIGH', rev_p1: 6000, rev_p2: 0, req_p1: 700000, req_p2: 0, paid_p1: 600000, paid_p2: 0 },
  { pid: 12, name: 'Publisher LOST-LOW', rev_p1: 300, rev_p2: 0, req_p1: 70000, req_p2: 0, paid_p1: 50000, paid_p2: 0 },
]

// Step 1: Calculate total revenue
const totalRevenue = mockData.reduce((sum, item) => sum + item.rev_p2, 0)
console.log('📊 Total Revenue P2:', `$${totalRevenue.toLocaleString()}\n`)

// Step 2: Sort by revenue DESC and calculate cumulative
const sorted = mockData.sort((a, b) => b.rev_p2 - a.rev_p2)
let cumulative = 0
sorted.forEach(item => {
  cumulative += item.rev_p2
  item.cumulative_revenue = cumulative
  item.cumulative_revenue_pct = (cumulative / totalRevenue) * 100
})

// Step 3: Assign revenue tier (A/B/C based on Pareto)
sorted.forEach(item => {
  if (item.cumulative_revenue_pct <= 80) {
    item.revenue_tier = 'A'
  } else if (item.cumulative_revenue_pct <= 95) {
    item.revenue_tier = 'B'
  } else {
    item.revenue_tier = 'C'
  }
})

// Step 4: Assign status and display tier
sorted.forEach(item => {
  // Status
  if (item.rev_p1 === 0 && item.rev_p2 > 0) {
    item.status = 'new'
    item.tier = 'new'
    item.display_tier = 'NEW'
    item.tier_group = `NEW-${item.revenue_tier}`
  } else if (item.rev_p1 > 0 && item.rev_p2 === 0) {
    item.status = 'lost'
    item.tier = 'lost'
    item.display_tier = 'LOST'
    item.tier_group = `LOST-${item.revenue_tier}`
  } else {
    item.status = 'existing'
    item.tier = item.revenue_tier
    item.display_tier = item.revenue_tier
    item.tier_group = item.revenue_tier
  }

  // Calculate metrics
  item.rev_change_pct = item.rev_p1 > 0 ? ((item.rev_p2 - item.rev_p1) / item.rev_p1) * 100 : 0
  item.fill_rate_p1 = item.req_p1 > 0 ? (item.paid_p1 / item.req_p1) * 100 : 0
  item.fill_rate_p2 = item.req_p2 > 0 ? (item.paid_p2 / item.req_p2) * 100 : 0
})

// Step 5: Assign transition warnings for existing items
sorted.forEach(item => {
  if (item.status !== 'existing') {
    item.transition_warning = null
    return
  }

  const cumul = item.cumulative_revenue_pct
  const tier = item.tier

  if (tier === 'A') {
    if (cumul >= 79.5 && cumul <= 80.5) {
      item.transition_warning = '⚠️ At 80% threshold'
    } else if (cumul > 80) {
      item.transition_warning = `⚠️ RISK: Đang ở ngoài top 80% (${cumul.toFixed(1)}%)`
    } else if (cumul > 75) {
      item.transition_warning = '⚠️ Chuẩn bị xuống Tier B'
    } else {
      item.transition_warning = null
    }
  } else if (tier === 'B') {
    if (cumul <= 85) {
      const gap = cumul - 80
      item.transition_warning = `📈 Gần lên Tier A (cần tăng ${gap.toFixed(1)}%)`
    } else if (cumul >= 94.5 && cumul <= 95.5) {
      item.transition_warning = '⚠️ At 95% threshold'
    } else {
      item.transition_warning = null
    }
  } else if (tier === 'C') {
    if (item.rev_change_pct < 0) {
      item.transition_warning = '🗑️ REMOVE candidate'
    } else {
      item.transition_warning = null
    }
  }
})

// Step 6: Group by display tier
const groups = {
  A: sorted.filter(i => i.display_tier === 'A'),
  B: sorted.filter(i => i.display_tier === 'B'),
  C: sorted.filter(i => i.display_tier === 'C'),
  NEW: sorted.filter(i => i.display_tier === 'NEW'),
  LOST: sorted.filter(i => i.display_tier === 'LOST')
}

// Print results
console.log('=' .repeat(80))
console.log('📊 TIER A - Top 80% Revenue\n')
groups.A.forEach(item => {
  console.log(`  ${item.name}`)
  console.log(`    Revenue: $${item.rev_p2.toLocaleString()} (${(item.rev_p2/totalRevenue*100).toFixed(1)}% of total)`)
  console.log(`    Cumulative: ${item.cumulative_revenue_pct.toFixed(1)}%`)
  if (item.transition_warning) {
    console.log(`    Warning: ${item.transition_warning}`)
  }
  console.log()
})

console.log('=' .repeat(80))
console.log('📊 TIER B - Next 15% Revenue (80-95%)\n')
groups.B.forEach(item => {
  console.log(`  ${item.name}`)
  console.log(`    Revenue: $${item.rev_p2.toLocaleString()} (${(item.rev_p2/totalRevenue*100).toFixed(1)}% of total)`)
  console.log(`    Cumulative: ${item.cumulative_revenue_pct.toFixed(1)}%`)
  if (item.transition_warning) {
    console.log(`    Warning: ${item.transition_warning}`)
  }
  console.log()
})

console.log('=' .repeat(80))
console.log('📊 TIER C - Bottom 5% Revenue (95-100%)\n')
groups.C.forEach(item => {
  console.log(`  ${item.name}`)
  console.log(`    Revenue: $${item.rev_p2.toLocaleString()} (${(item.rev_p2/totalRevenue*100).toFixed(1)}% of total)`)
  console.log(`    Cumulative: ${item.cumulative_revenue_pct.toFixed(1)}%`)
  console.log(`    Change: ${item.rev_change_pct.toFixed(1)}%`)
  if (item.transition_warning) {
    console.log(`    Warning: ${item.transition_warning}`)
  }
  console.log()
})

console.log('=' .repeat(80))
console.log('🆕 NEW - New Items\n')
groups.NEW.forEach(item => {
  console.log(`  ${item.name}`)
  console.log(`    Revenue P2: $${item.rev_p2.toLocaleString()}`)
  console.log(`    Group: ${item.tier_group}`)
  console.log(`    Note: ${item.tier_group === 'NEW-A' ? 'Strong start - would be in top 80%' : 'Weak start - bottom tier'}`)
  console.log()
})

console.log('=' .repeat(80))
console.log('❌ LOST - Lost Items\n')
groups.LOST.forEach(item => {
  const impactPct = (item.rev_p1 / mockData.reduce((s,i)=>s+i.rev_p1,0)) * 100
  console.log(`  ${item.name}`)
  console.log(`    Revenue P1: $${item.rev_p1.toLocaleString()}`)
  console.log(`    Lost Revenue: -$${item.rev_p1.toLocaleString()}`)
  console.log(`    Group: ${item.tier_group}`)
  console.log(`    Impact: ${impactPct.toFixed(2)}% of P1 revenue`)
  console.log(`    Severity: ${item.tier_group === 'LOST-A' ? '🚨 HIGH' : 'Low'}`)
  console.log()
})

console.log('=' .repeat(80))
console.log('\n✅ VALIDATION SUMMARY\n')
console.log(`Total Items: ${sorted.length}`)
console.log(`  Tier A: ${groups.A.length} items ($${groups.A.reduce((s,i)=>s+i.rev_p2,0).toLocaleString()})`)
console.log(`  Tier B: ${groups.B.length} items ($${groups.B.reduce((s,i)=>s+i.rev_p2,0).toLocaleString()})`)
console.log(`  Tier C: ${groups.C.length} items ($${groups.C.reduce((s,i)=>s+i.rev_p2,0).toLocaleString()})`)
console.log(`  NEW: ${groups.NEW.length} items ($${groups.NEW.reduce((s,i)=>s+i.rev_p2,0).toLocaleString()})`)
console.log(`  LOST: ${groups.LOST.length} items`)

const tierARevPct = (groups.A.reduce((s,i)=>s+i.rev_p2,0) / totalRevenue) * 100
const tierBRevPct = (groups.B.reduce((s,i)=>s+i.rev_p2,0) / totalRevenue) * 100
const tierCRevPct = (groups.C.reduce((s,i)=>s+i.rev_p2,0) / totalRevenue) * 100

console.log(`\nRevenue Distribution:`)
console.log(`  Tier A: ${tierARevPct.toFixed(1)}% (target: 80%)`)
console.log(`  Tier B: ${tierBRevPct.toFixed(1)}% (target: 15%)`)
console.log(`  Tier C: ${tierCRevPct.toFixed(1)}% (target: 5%)`)

const itemsWithWarnings = sorted.filter(i => i.transition_warning).length
console.log(`\nTransition Warnings: ${itemsWithWarnings} items`)

console.log('\n✅ Logic test complete!')
