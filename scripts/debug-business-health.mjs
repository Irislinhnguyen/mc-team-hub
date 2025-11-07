#!/usr/bin/env node

/**
 * Debug script to compare Business Health data between current implementation and Looker Studio
 *
 * This script will:
 * 1. Test current query with Sep 30 - Oct 30, 2025 filters
 * 2. Show exact SQL being generated
 * 3. Display results and compare with expected Looker Studio values
 * 4. Test different date boundary scenarios (inclusive vs exclusive)
 */

import { BigQuery } from '@google-cloud/bigquery'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize BigQuery
const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  keyFilename: path.join(__dirname, '..', 'service-account.json'),
})

// Expected values from Looker Studio
const LOOKER_EXPECTED = {
  rev: 604587,
  profit: 131985,
  paid: 846300000, // 846.3M
  req: 1200000000, // 1.2B
  profit_rate: 21.2,
}

const TABLE_NAME = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'

// Test filters
const filters = {
  startDate: '2025-09-30',
  endDate: '2025-10-30',
}

console.log('🔍 DEBUG: Business Health Data Discrepancy Analysis')
console.log('=' .repeat(80))
console.log(`📅 Date Range: ${filters.startDate} to ${filters.endDate}`)
console.log('=' .repeat(80))
console.log()

/**
 * Test 1: Current implementation (inclusive end date)
 */
async function testCurrentImplementation() {
  console.log('📊 TEST 1: Current Implementation (DATE >= start AND DATE <= end)')
  console.log('-'.repeat(80))

  const query = `
    SELECT
      SUM(rev) as total_revenue,
      SUM(profit) as total_profit,
      SUM(paid) as total_paid,
      SUM(req) as total_requests,
      ROUND(SUM(profit) / NULLIF(SUM(rev), 0) * 100, 1) as profit_rate,
      COUNT(*) as record_count,
      COUNT(DISTINCT DATE) as distinct_dates,
      MIN(DATE) as min_date,
      MAX(DATE) as max_date
    FROM ${TABLE_NAME}
    WHERE DATE >= '${filters.startDate}' AND DATE <= '${filters.endDate}'
  `

  console.log('SQL Query:')
  console.log(query)
  console.log()

  const [rows] = await bigquery.query(query)
  const result = rows[0]

  console.log('Results:')
  console.log(`  REV:          ${result.total_revenue?.toLocaleString()} (Expected: ${LOOKER_EXPECTED.rev.toLocaleString()})`)
  console.log(`  PROFIT:       ${result.total_profit?.toLocaleString()} (Expected: ${LOOKER_EXPECTED.profit.toLocaleString()})`)
  console.log(`  PAID:         ${(result.total_paid / 1000000).toFixed(1)}M (Expected: ${(LOOKER_EXPECTED.paid / 1000000).toFixed(1)}M)`)
  console.log(`  REQ:          ${(result.total_requests / 1000000).toFixed(1)}M (Expected: ${(LOOKER_EXPECTED.req / 1000000).toFixed(1)}M)`)
  console.log(`  PROFIT RATE:  ${result.profit_rate}% (Expected: ${LOOKER_EXPECTED.profit_rate}%)`)
  console.log()
  console.log(`  📈 Record Count: ${result.record_count}`)
  console.log(`  📅 Distinct Dates: ${result.distinct_dates}`)
  console.log(`  📅 Date Range: ${result.min_date?.value || result.min_date} to ${result.max_date?.value || result.max_date}`)
  console.log()

  return result
}

/**
 * Test 2: Exclusive end date (DATE >= start AND DATE < end)
 */
async function testExclusiveEndDate() {
  console.log('📊 TEST 2: Exclusive End Date (DATE >= start AND DATE < end)')
  console.log('-'.repeat(80))

  const query = `
    SELECT
      SUM(rev) as total_revenue,
      SUM(profit) as total_profit,
      SUM(paid) as total_paid,
      SUM(req) as total_requests,
      ROUND(SUM(profit) / NULLIF(SUM(rev), 0) * 100, 1) as profit_rate,
      COUNT(*) as record_count,
      COUNT(DISTINCT DATE) as distinct_dates,
      MIN(DATE) as min_date,
      MAX(DATE) as max_date
    FROM ${TABLE_NAME}
    WHERE DATE >= '${filters.startDate}' AND DATE < '${filters.endDate}'
  `

  console.log('SQL Query:')
  console.log(query)
  console.log()

  const [rows] = await bigquery.query(query)
  const result = rows[0]

  console.log('Results:')
  console.log(`  REV:          ${result.total_revenue?.toLocaleString()} (Expected: ${LOOKER_EXPECTED.rev.toLocaleString()})`)
  console.log(`  PROFIT:       ${result.total_profit?.toLocaleString()} (Expected: ${LOOKER_EXPECTED.profit.toLocaleString()})`)
  console.log(`  PAID:         ${(result.total_paid / 1000000).toFixed(1)}M (Expected: ${(LOOKER_EXPECTED.paid / 1000000).toFixed(1)}M)`)
  console.log(`  REQ:          ${(result.total_requests / 1000000).toFixed(1)}M (Expected: ${(LOOKER_EXPECTED.req / 1000000).toFixed(1)}M)`)
  console.log(`  PROFIT RATE:  ${result.profit_rate}% (Expected: ${LOOKER_EXPECTED.profit_rate}%)`)
  console.log()
  console.log(`  📈 Record Count: ${result.record_count}`)
  console.log(`  📅 Distinct Dates: ${result.distinct_dates}`)
  console.log(`  📅 Date Range: ${result.min_date?.value || result.min_date} to ${result.max_date?.value || result.max_date}`)
  console.log()

  return result
}

/**
 * Test 3: Show daily breakdown to identify anomalies
 */
async function testDailyBreakdown() {
  console.log('📊 TEST 3: Daily Breakdown (to identify anomalies)')
  console.log('-'.repeat(80))

  const query = `
    SELECT
      DATE,
      SUM(rev) as rev,
      SUM(profit) as profit,
      SUM(paid) as paid,
      SUM(req) as req,
      COUNT(*) as records_per_day
    FROM ${TABLE_NAME}
    WHERE DATE >= '${filters.startDate}' AND DATE <= '${filters.endDate}'
    GROUP BY DATE
    ORDER BY DATE ASC
  `

  const [rows] = await bigquery.query(query)

  console.log('Daily Data:')
  console.log('Date       | Rev      | Profit   | Paid (M) | Req (M)  | Records')
  console.log('-'.repeat(80))

  rows.forEach(row => {
    const date = row.DATE?.value || row.DATE
    const rev = row.rev || 0
    const profit = row.profit || 0
    const paid = (row.paid || 0) / 1000000
    const req = (row.req || 0) / 1000000
    const records = row.records_per_day || 0

    console.log(
      `${date} | ${String(rev).padStart(8)} | ${String(profit).padStart(8)} | ` +
      `${paid.toFixed(1).padStart(8)} | ${req.toFixed(1).padStart(8)} | ${records}`
    )
  })
  console.log()

  return rows
}

/**
 * Test 4: Check for duplicate records
 */
async function testDuplicates() {
  console.log('📊 TEST 4: Check for Duplicate Records')
  console.log('-'.repeat(80))

  const query = `
    SELECT
      DATE,
      pic,
      pid,
      mid,
      zid,
      COUNT(*) as duplicate_count
    FROM ${TABLE_NAME}
    WHERE DATE >= '${filters.startDate}' AND DATE <= '${filters.endDate}'
    GROUP BY DATE, pic, pid, mid, zid
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC
    LIMIT 20
  `

  const [rows] = await bigquery.query(query)

  if (rows.length === 0) {
    console.log('✅ No duplicates found')
  } else {
    console.log(`⚠️  Found ${rows.length} duplicate combinations:`)
    rows.forEach(row => {
      console.log(`  Date: ${row.DATE?.value || row.DATE}, pic: ${row.pic}, pid: ${row.pid}, mid: ${row.mid}, zid: ${row.zid} - Count: ${row.duplicate_count}`)
    })
  }
  console.log()
}

/**
 * Test 5: Check data types returned by BigQuery
 */
async function testDataTypes() {
  console.log('📊 TEST 5: Check BigQuery Data Types')
  console.log('-'.repeat(80))

  const query = `
    SELECT
      SUM(rev) as total_revenue,
      SUM(profit) as total_profit,
      SUM(paid) as total_paid,
      SUM(req) as total_requests
    FROM ${TABLE_NAME}
    WHERE DATE >= '${filters.startDate}' AND DATE <= '${filters.endDate}'
  `

  const [rows] = await bigquery.query(query)
  const result = rows[0]

  console.log('Data type inspection:')
  console.log(`  total_revenue type: ${typeof result.total_revenue}`)
  console.log(`  total_revenue value: ${JSON.stringify(result.total_revenue)}`)
  console.log(`  total_profit type: ${typeof result.total_profit}`)
  console.log(`  total_profit value: ${JSON.stringify(result.total_profit)}`)
  console.log(`  total_paid type: ${typeof result.total_paid}`)
  console.log(`  total_paid value: ${JSON.stringify(result.total_paid)}`)
  console.log(`  total_requests type: ${typeof result.total_requests}`)
  console.log(`  total_requests value: ${JSON.stringify(result.total_requests)}`)
  console.log()
}

/**
 * Test 6: Looker Studio simulation - test different date interpretations
 */
async function testLookerStudioScenarios() {
  console.log('📊 TEST 6: Looker Studio Date Interpretation Scenarios')
  console.log('-'.repeat(80))

  const scenarios = [
    {
      name: 'Inclusive both dates (current)',
      where: `DATE >= '${filters.startDate}' AND DATE <= '${filters.endDate}'`
    },
    {
      name: 'Exclusive end date',
      where: `DATE >= '${filters.startDate}' AND DATE < '${filters.endDate}'`
    },
    {
      name: 'Inclusive start, exclusive end + 1 day',
      where: `DATE >= '${filters.startDate}' AND DATE < '2025-10-31'`
    },
    {
      name: 'Between (inclusive both)',
      where: `DATE BETWEEN '${filters.startDate}' AND '${filters.endDate}'`
    }
  ]

  for (const scenario of scenarios) {
    console.log(`\n🔸 ${scenario.name}`)
    const query = `
      SELECT
        SUM(rev) as rev,
        SUM(profit) as profit,
        SUM(paid) as paid,
        SUM(req) as req,
        ROUND(SUM(profit) / NULLIF(SUM(rev), 0) * 100, 1) as profit_rate
      FROM ${TABLE_NAME}
      WHERE ${scenario.where}
    `

    const [rows] = await bigquery.query(query)
    const r = rows[0]

    const revMatch = Math.abs(r.rev - LOOKER_EXPECTED.rev) < 1000
    const profitMatch = Math.abs(r.profit - LOOKER_EXPECTED.profit) < 1000

    console.log(`  REV: ${r.rev?.toLocaleString()} ${revMatch ? '✅' : '❌'}`)
    console.log(`  PROFIT: ${r.profit?.toLocaleString()} ${profitMatch ? '✅' : '❌'}`)
    console.log(`  PAID: ${(r.paid / 1000000).toFixed(1)}M`)
    console.log(`  REQ: ${(r.req / 1000000).toFixed(1)}M`)
    console.log(`  PROFIT RATE: ${r.profit_rate}%`)
  }
  console.log()
}

// Run all tests
async function main() {
  try {
    await testCurrentImplementation()
    await testExclusiveEndDate()
    await testDailyBreakdown()
    await testDuplicates()
    await testDataTypes()
    await testLookerStudioScenarios()

    console.log('=' .repeat(80))
    console.log('✅ Debug tests completed!')
    console.log()
    console.log('📝 Next Steps:')
    console.log('   1. Review which scenario matches Looker Studio values')
    console.log('   2. Check for any duplicate records or data quality issues')
    console.log('   3. Verify profit calculation formula')
    console.log('   4. Consider timezone differences if any')

  } catch (error) {
    console.error('❌ Error running debug tests:', error)
    process.exit(1)
  }
}

main()
