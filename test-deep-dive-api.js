/**
 * Test Deep Dive API and verify data with BigQuery
 *
 * This script:
 * 1. Calls the Deep Dive API with the same filters from the screenshot
 * 2. Prints the SQL query that was generated
 * 3. Shows the results
 * 4. Provides a BigQuery verification query you can run manually
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

// Filters from the screenshot
const testRequest = {
  perspective: 'pid', // Publisher perspective
  period1: {
    start: '2025-09-17',
    end: '2025-10-14'
  },
  period2: {
    start: '2025-10-15',
    end: '2025-11-11'
  },
  filters: {
    team: 'App' // Team filter = "App"
  },
  simplifiedFilter: {
    includeExclude: 'INCLUDE',
    clauses: [],
    clauseLogic: 'AND'
  }
}

console.log('═══════════════════════════════════════════════════════')
console.log('🧪 DEEP DIVE API TEST')
console.log('═══════════════════════════════════════════════════════')
console.log('\n📋 Test Request:')
console.log(JSON.stringify(testRequest, null, 2))
console.log('\n🚀 Calling API...\n')

async function testAPI() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const result = await response.json()

    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ API RESPONSE')
    console.log('═══════════════════════════════════════════════════════')

    console.log('\n📊 Summary:')
    console.log('─────────────────────────────────────────────────────')
    console.log(`Total Items: ${result.summary.total_items}`)
    console.log(`Total Revenue P1: $${result.summary.total_revenue_p1.toFixed(2)}`)
    console.log(`Total Revenue P2: $${result.summary.total_revenue_p2.toFixed(2)}`)
    console.log(`Revenue Change: ${result.summary.revenue_change_pct.toFixed(2)}%`)
    console.log(`Total Requests P1: ${result.summary.total_requests_p1.toLocaleString()}`)
    console.log(`Total Requests P2: ${result.summary.total_requests_p2.toLocaleString()}`)
    console.log(`Requests Change: ${result.summary.requests_change_pct.toFixed(2)}%`)
    console.log(`Total eCPM P1: $${result.summary.total_ecpm_p1.toFixed(2)}`)
    console.log(`Total eCPM P2: $${result.summary.total_ecpm_p2.toFixed(2)}`)
    console.log(`eCPM Change: ${result.summary.ecpm_change_pct.toFixed(2)}%`)

    console.log('\n📈 Tier Distribution:')
    console.log('─────────────────────────────────────────────────────')
    console.log(`Tier A: ${result.summary.tier_counts.A} items ($${result.summary.tier_revenue.A.toFixed(2)})`)
    console.log(`Tier B: ${result.summary.tier_counts.B} items ($${result.summary.tier_revenue.B.toFixed(2)})`)
    console.log(`Tier C: ${result.summary.tier_counts.C} items ($${result.summary.tier_revenue.C.toFixed(2)})`)
    console.log(`NEW: ${result.summary.tier_counts.NEW} items ($${result.summary.tier_revenue.NEW.toFixed(2)})`)
    console.log(`LOST: ${result.summary.tier_counts.LOST} items ($${result.summary.tier_revenue.LOST.toFixed(2)})`)

    console.log('\n📝 Top 10 Publishers (by Period 2 Revenue):')
    console.log('─────────────────────────────────────────────────────')
    result.data.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. PID ${item.pid} - ${item.pubname || 'N/A'}`)
      console.log(`   Tier: ${item.display_tier} | Status: ${item.status}`)
      console.log(`   P1 Rev: $${item.rev_p1.toFixed(2)} | P2 Rev: $${item.rev_p2.toFixed(2)} (${item.rev_change_pct?.toFixed(2) || 0}%)`)
      console.log(`   P1 Req: ${item.req_p1.toLocaleString()} | P2 Req: ${item.req_p2.toLocaleString()}`)
      console.log(`   P1 eCPM: $${(item.ecpm_p1 || 0).toFixed(2)} | P2 eCPM: $${(item.ecpm_p2 || 0).toFixed(2)}`)
      if (item.warning_message) {
        console.log(`   ⚠️  ${item.warning_severity.toUpperCase()}: ${item.warning_message}`)
      }
      console.log('')
    })

    console.log('\n═══════════════════════════════════════════════════════')
    console.log('🔍 BIGQUERY VERIFICATION QUERY')
    console.log('═══════════════════════════════════════════════════════')
    console.log('\nRun this query in BigQuery to verify the results:\n')

    const verificationQuery = `
-- Verification Query for Deep Dive API Results
-- This query should match the API results exactly

SELECT
  pid,
  pubname,

  -- Period 1 metrics (${testRequest.period1.start} to ${testRequest.period1.end})
  SUM(CASE WHEN DATE >= '${testRequest.period1.start}' AND DATE <= '${testRequest.period1.end}' THEN req ELSE 0 END) as req_p1,
  SUM(CASE WHEN DATE >= '${testRequest.period1.start}' AND DATE <= '${testRequest.period1.end}' THEN rev ELSE 0 END) as rev_p1,
  SUM(CASE WHEN DATE >= '${testRequest.period1.start}' AND DATE <= '${testRequest.period1.end}' THEN paid ELSE 0 END) as paid_p1,

  -- Period 2 metrics (${testRequest.period2.start} to ${testRequest.period2.end})
  SUM(CASE WHEN DATE >= '${testRequest.period2.start}' AND DATE <= '${testRequest.period2.end}' THEN req ELSE 0 END) as req_p2,
  SUM(CASE WHEN DATE >= '${testRequest.period2.start}' AND DATE <= '${testRequest.period2.end}' THEN rev ELSE 0 END) as rev_p2,
  SUM(CASE WHEN DATE >= '${testRequest.period2.start}' AND DATE <= '${testRequest.period2.end}' THEN paid ELSE 0 END) as paid_p2,

  -- eCPM calculations
  AVG(CASE WHEN DATE >= '${testRequest.period1.start}' AND DATE <= '${testRequest.period1.end}' THEN CAST(request_CPM as FLOAT64) ELSE NULL END) as ecpm_p1,
  AVG(CASE WHEN DATE >= '${testRequest.period2.start}' AND DATE <= '${testRequest.period2.end}' THEN CAST(request_CPM as FLOAT64) ELSE NULL END) as ecpm_p2

FROM \`your-project.your-dataset.table_name\`
WHERE 1=1
  AND team = 'App'  -- Filter by team
GROUP BY pid, pubname
HAVING rev_p2 > 0 OR rev_p1 > 0  -- Exclude publishers with no revenue in both periods
ORDER BY rev_p2 DESC
LIMIT 20;
`

    console.log(verificationQuery)

    console.log('\n📋 Instructions:')
    console.log('─────────────────────────────────────────────────────')
    console.log('1. Copy the query above')
    console.log('2. Replace `your-project.your-dataset.table_name` with your actual BigQuery table')
    console.log('3. Run in BigQuery console')
    console.log('4. Compare the results with the API output above')
    console.log('\n🔎 What to check:')
    console.log('   - Do the PIDs match?')
    console.log('   - Do the revenue numbers match?')
    console.log('   - Do the request numbers match?')
    console.log('   - Are the eCPM values similar?')

    console.log('\n═══════════════════════════════════════════════════════')
    console.log('💾 Saving full API response to file...')
    console.log('═══════════════════════════════════════════════════════')

    const fs = require('fs')
    fs.writeFileSync(
      'deep-dive-api-response.json',
      JSON.stringify(result, null, 2)
    )
    console.log('✅ Saved to: deep-dive-api-response.json')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
  }
}

// Run the test
testAPI()
