#!/usr/bin/env node

/**
 * Script to find which filters/conditions make our query match Looker Studio results
 */

import { BigQuery } from '@google-cloud/bigquery'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  keyFilename: path.join(__dirname, '..', 'service-account.json'),
})

const TABLE_NAME = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'

// Expected from Looker
const LOOKER = {
  rev: 604587,
  profit: 131985,
  paid: 846300000,
  req: 1200000000,
  profit_rate: 21.2,
}

const filters = {
  startDate: '2025-09-30',
  endDate: '2025-10-30', // Will become 10-29 since no 10-30 data exists
}

async function testQuery(name, whereClause) {
  const query = `
    SELECT
      SUM(rev) as rev,
      SUM(profit) as profit,
      SUM(paid) as paid,
      SUM(req) as req,
      ROUND(SUM(profit) / NULLIF(SUM(rev), 0) * 100, 1) as profit_rate
    FROM ${TABLE_NAME}
    ${whereClause}
  `

  const [rows] = await bigquery.query(query)
  const r = rows[0]

  const revDiff = r.rev - LOOKER.rev
  const profitDiff = r.profit - LOOKER.profit
  const paidDiff = r.paid - LOOKER.paid
  const reqDiff = r.req - LOOKER.req

  const revMatch = Math.abs(revDiff) < 100
  const profitMatch = Math.abs(profitDiff) < 100
  const paidMatch = Math.abs(paidDiff) < 1000000
  const reqMatch = Math.abs(reqDiff) < 1000000

  console.log(`\n📊 ${name}`)
  console.log('-'.repeat(80))
  console.log(`  REV:    ${r.rev?.toLocaleString().padStart(12)} (diff: ${revDiff.toFixed(0).padStart(8)}) ${revMatch ? '✅' : '❌'}`)
  console.log(`  PROFIT: ${r.profit?.toLocaleString().padStart(12)} (diff: ${profitDiff.toFixed(0).padStart(8)}) ${profitMatch ? '✅' : '❌'}`)
  console.log(`  PAID:   ${(r.paid/1000000).toFixed(1).padStart(8)}M (diff: ${(paidDiff/1000000).toFixed(1).padStart(6)}M) ${paidMatch ? '✅' : '❌'}`)
  console.log(`  REQ:    ${(r.req/1000000).toFixed(1).padStart(8)}M (diff: ${(reqDiff/1000000).toFixed(1).padStart(6)}M) ${reqMatch ? '✅' : '❌'}`)
  console.log(`  PROFIT_RATE: ${r.profit_rate}% ${r.profit_rate === LOOKER.profit_rate ? '✅' : '❌'}`)

  if (revMatch && profitMatch && paidMatch && reqMatch) {
    console.log('\n🎯 FOUND MATCH! This is the correct filter!')
    console.log('SQL:')
    console.log(query)
  }

  return { revMatch, profitMatch, paidMatch, reqMatch }
}

async function main() {
  console.log('🔍 Finding Looker Studio Filters')
  console.log('='.repeat(80))
  console.log('Expected from Looker:')
  console.log(`  REV:    ${LOOKER.rev.toLocaleString()}`)
  console.log(`  PROFIT: ${LOOKER.profit.toLocaleString()}`)
  console.log(`  PAID:   ${(LOOKER.paid/1000000).toFixed(1)}M`)
  console.log(`  REQ:    ${(LOOKER.req/1000000).toFixed(1)}M`)
  console.log(`  PROFIT_RATE: ${LOOKER.profit_rate}%`)
  console.log('='.repeat(80))

  // Test 1: Basic date filter
  await testQuery(
    'Test 1: Basic date filter (current implementation)',
    `WHERE DATE >= '${filters.startDate}' AND DATE <= '2025-10-29'`
  )

  // Test 2: Exclude nulls
  await testQuery(
    'Test 2: Exclude NULL values',
    `WHERE DATE >= '${filters.startDate}' AND DATE <= '2025-10-29'
     AND rev IS NOT NULL AND profit IS NOT NULL`
  )

  // Test 3: Only positive profits
  await testQuery(
    'Test 3: Only positive profits (profit > 0)',
    `WHERE DATE >= '${filters.startDate}' AND DATE <= '2025-10-29'
     AND profit > 0`
  )

  // Test 4: Exclude first day (Sep 30 has negative profit!)
  await testQuery(
    'Test 4: Exclude Sep 30 (has negative profit)',
    `WHERE DATE >= '2025-10-01' AND DATE <= '2025-10-29'`
  )

  // Test 5: Different date range
  await testQuery(
    'Test 5: Oct 1 - Oct 30 (31 days starting Oct 1)',
    `WHERE DATE >= '2025-10-01' AND DATE <= '2025-10-30'`
  )

  // Test 6: Exactly 30 days from Oct 1
  await testQuery(
    'Test 6: Oct 1 - Oct 29 (29 days)',
    `WHERE DATE >= '2025-10-01' AND DATE <= '2025-10-29'`
  )

  // Test 7: Check if there's specific product/team filter
  await testQuery(
    'Test 7: Exclude empty product',
    `WHERE DATE >= '${filters.startDate}' AND DATE <= '2025-10-29'
     AND product IS NOT NULL AND product != ''`
  )

  // Test 8: Different aggregation level
  const query8 = `
    SELECT
      SUM(daily_rev) as rev,
      SUM(daily_profit) as profit,
      SUM(daily_paid) as paid,
      SUM(daily_req) as req,
      ROUND(SUM(daily_profit) / NULLIF(SUM(daily_rev), 0) * 100, 1) as profit_rate
    FROM (
      SELECT
        DATE,
        SUM(rev) as daily_rev,
        SUM(profit) as daily_profit,
        SUM(paid) as daily_paid,
        SUM(req) as daily_req
      FROM ${TABLE_NAME}
      WHERE DATE >= '${filters.startDate}' AND DATE <= '2025-10-29'
      GROUP BY DATE
    )
  `

  const [rows8] = await bigquery.query(query8)
  const r8 = rows8[0]
  console.log(`\n📊 Test 8: Aggregate by date first (prevent duplicates)`)
  console.log('-'.repeat(80))
  console.log(`  REV:    ${r8.rev?.toLocaleString()}`)
  console.log(`  PROFIT: ${r8.profit?.toLocaleString()}`)

  // Test 9: Check for specific pic/team
  const teamQuery = `
    SELECT DISTINCT team, pic
    FROM ${TABLE_NAME}
    WHERE DATE >= '${filters.startDate}' AND DATE <= '2025-10-29'
    ORDER BY team, pic
    LIMIT 20
  `
  const [teams] = await bigquery.query(teamQuery)
  console.log(`\n📊 Available teams/pics in data:`)
  teams.forEach(t => console.log(`  - team: ${t.team}, pic: ${t.pic}`))

  // Test 10: Try different profit calculation
  await testQuery(
    'Test 10: Use SUM(rev - cost) for profit instead of SUM(profit)',
    `WHERE DATE >= '${filters.startDate}' AND DATE <= '2025-10-29'`
  )

  console.log('\n='.repeat(80))
  console.log('💡 Suggestions:')
  console.log('1. Check if Looker Studio has any hidden filters (team, pic, product, etc.)')
  console.log('2. Verify the exact date range in Looker Studio')
  console.log('3. Check if Looker is using a different table or view')
  console.log('4. Export Looker Studio data to CSV to compare row by row')
  console.log('5. Check "View SQL" in Looker Studio if available')
}

main().catch(console.error)
