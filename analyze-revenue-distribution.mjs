#!/usr/bin/env node

/**
 * Revenue Distribution Analysis Script
 *
 * Purpose: Validate if the 80-15-5 Pareto Principle applies to our data
 * - Analyzes actual revenue distribution across PIDs, MIDs, Products, Zones
 * - Calculates cumulative percentages and identifies breakpoints
 * - Recommends optimal tier thresholds based on empirical data
 */

import { BigQuery } from '@google-cloud/bigquery'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const PERSPECTIVES = ['pid', 'mid', 'product', 'zone']

// Initialize BigQuery client
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
if (!credentialsJson) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set')
  process.exit(1)
}

const credentials = JSON.parse(credentialsJson)
const bigquery = new BigQuery({
  projectId: credentials.project_id,
  credentials
})

/**
 * Analyze revenue distribution for a specific perspective
 */
async function analyzeDistribution(perspective, startDate, endDate) {
  // Map perspective to appropriate grouping field and name
  const fieldMapping = {
    pid: { group: 'pid', name: 'pid', idType: 'number' },
    mid: { group: 'mid', name: 'zonename', idType: 'number' },
    product: { group: 'product', name: 'product', idType: 'string' },
    zone: { group: 'zid', name: 'zonename', idType: 'number' }
  }

  const { group, name } = fieldMapping[perspective]

  const query = `
    WITH entity_revenue AS (
      SELECT
        ${group} as id,
        ${name} as name,
        SUM(rev) as total_revenue
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE >= @startDate
        AND DATE <= @endDate
        AND rev > 0
        AND ${group} IS NOT NULL
      GROUP BY ${group}, ${name}
    ),
    ranked_revenue AS (
      SELECT
        id,
        name,
        total_revenue,
        SUM(total_revenue) OVER () as grand_total,
        SUM(total_revenue) OVER (ORDER BY total_revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_revenue,
        ROW_NUMBER() OVER (ORDER BY total_revenue DESC) as rank
      FROM entity_revenue
    ),
    percentile_calc AS (
      SELECT
        id,
        name,
        total_revenue,
        grand_total,
        cumulative_revenue,
        rank,
        COUNT(*) OVER () as total_count,
        (cumulative_revenue / NULLIF(grand_total, 0)) * 100 as cumulative_pct,
        (total_revenue / NULLIF(grand_total, 0)) * 100 as revenue_pct
      FROM ranked_revenue
    )
    SELECT *
    FROM percentile_calc
    ORDER BY rank
  `

  const options = {
    query,
    params: { startDate, endDate }
  }

  const [rows] = await bigquery.query(options)
  return rows
}

/**
 * Calculate Pareto breakpoints
 */
function analyzeBreakpoints(data) {
  const totalCount = data.length

  // Find where cumulative % crosses key thresholds
  const thresholds = [50, 60, 70, 75, 80, 85, 90, 95, 99]
  const breakpoints = {}

  thresholds.forEach(threshold => {
    const index = data.findIndex(row => row.cumulative_pct >= threshold)
    if (index >= 0) {
      const itemCount = index + 1
      const pctOfItems = (itemCount / totalCount) * 100
      breakpoints[threshold] = {
        itemCount,
        pctOfItems: pctOfItems.toFixed(2),
        cumulativeRevenue: data[index].cumulative_revenue,
        cumulativePct: data[index].cumulative_pct.toFixed(2)
      }
    }
  })

  return breakpoints
}

/**
 * Recommend tier thresholds based on data
 */
function recommendTiers(breakpoints, totalCount) {
  console.log('\n📊 TIER THRESHOLD RECOMMENDATIONS:\n')

  // Classic Pareto 80-20
  const p80 = breakpoints[80]
  console.log(`Classic Pareto (80-20 Rule):`)
  console.log(`  → Top ${p80.pctOfItems}% of items contribute 80% of revenue`)
  console.log(`  → This is ${parseInt(p80.pctOfItems) < 25 ? '✅ CLOSE TO' : '⚠️ DIFFERENT FROM'} the theoretical 20%\n`)

  // Current system: 80-15-5
  const p95 = breakpoints[95]
  console.log(`Current System (80-15-5):`)
  console.log(`  Category A: Top ${p80.pctOfItems}% of items → 80% revenue`)
  console.log(`  Category B: Next ${(p95.itemCount - p80.itemCount)} items (${((p95.itemCount - p80.itemCount) / totalCount * 100).toFixed(2)}%) → 15% revenue`)
  console.log(`  Category C: Remaining ${(totalCount - p95.itemCount)} items (${((totalCount - p95.itemCount) / totalCount * 100).toFixed(2)}%) → 5% revenue\n`)

  // Alternative: 70-20-10
  const p70 = breakpoints[70]
  const p90 = breakpoints[90]
  console.log(`Alternative (70-20-10):`)
  console.log(`  Category A: Top ${p70.pctOfItems}% of items → 70% revenue`)
  console.log(`  Category B: Next ${(p90.itemCount - p70.itemCount)} items (${((p90.itemCount - p70.itemCount) / totalCount * 100).toFixed(2)}%) → 20% revenue`)
  console.log(`  Category C: Remaining ${(totalCount - p90.itemCount)} items (${((totalCount - p90.itemCount) / totalCount * 100).toFixed(2)}%) → 10% revenue\n`)

  // 4-tier option: 60-20-15-5
  const p60 = breakpoints[60]
  const p75 = breakpoints[75]
  console.log(`4-Tier Option (60-20-15-5):`)
  console.log(`  Category A: Top ${p60.pctOfItems}% of items → 60% revenue`)
  console.log(`  Category B: Next ${(p75.itemCount - p60.itemCount)} items (${((p75.itemCount - p60.itemCount) / totalCount * 100).toFixed(2)}%) → 15% revenue`)
  console.log(`  Category C: Next ${(p90.itemCount - p75.itemCount)} items (${((p90.itemCount - p75.itemCount) / totalCount * 100).toFixed(2)}%) → 15% revenue`)
  console.log(`  Category D: Remaining ${(totalCount - p90.itemCount)} items (${((totalCount - p90.itemCount) / totalCount * 100).toFixed(2)}%) → 10% revenue\n`)
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🔍 REVENUE DISTRIBUTION ANALYSIS\n')
  console.log('Validating Pareto Principle (80-15-5) against actual data...\n')

  // Use last 30 days of data
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  console.log(`Date Range: ${startDate} to ${endDate}\n`)
  console.log('=' .repeat(80) + '\n')

  for (const perspective of PERSPECTIVES) {
    console.log(`\n📈 PERSPECTIVE: ${perspective.toUpperCase()}\n`)

    try {
      const data = await analyzeDistribution(perspective, startDate, endDate)

      if (!data || data.length === 0) {
        console.log(`⚠️ No data found for ${perspective}\n`)
        continue
      }

      const totalCount = data.length
      const grandTotal = data[0].grand_total

      console.log(`Total ${perspective}s: ${totalCount}`)
      console.log(`Total Revenue: $${grandTotal.toLocaleString()}\n`)

      // Calculate breakpoints
      const breakpoints = analyzeBreakpoints(data)

      console.log('Cumulative Revenue Distribution:')
      console.log('─'.repeat(80))
      console.log('Revenue %  | Item Count | % of Items | Cumulative $')
      console.log('─'.repeat(80))

      Object.entries(breakpoints).forEach(([threshold, info]) => {
        console.log(
          `${threshold.padStart(3)}%      | ` +
          `${info.itemCount.toString().padStart(10)} | ` +
          `${info.pctOfItems.padStart(9)}% | ` +
          `$${parseFloat(info.cumulativeRevenue).toLocaleString()}`
        )
      })
      console.log('─'.repeat(80))

      // Recommendations
      recommendTiers(breakpoints, totalCount)

      // Top/Bottom analysis
      const top10Pct = Math.ceil(totalCount * 0.1)
      const top10Revenue = data.slice(0, top10Pct).reduce((sum, row) => sum + row.total_revenue, 0)
      const top10Contribution = (top10Revenue / grandTotal * 100).toFixed(2)

      const bottom10Pct = Math.floor(totalCount * 0.1)
      const bottom10Revenue = data.slice(-bottom10Pct).reduce((sum, row) => sum + row.total_revenue, 0)
      const bottom10Contribution = (bottom10Revenue / grandTotal * 100).toFixed(2)

      console.log(`📌 Key Insights:`)
      console.log(`  → Top 10% (${top10Pct} items) contribute ${top10Contribution}% of revenue`)
      console.log(`  → Bottom 10% (${bottom10Pct} items) contribute ${bottom10Contribution}% of revenue`)
      console.log(`  → Revenue concentration: ${top10Contribution > 50 ? '🔴 HIGH' : top10Contribution > 35 ? '🟡 MEDIUM' : '🟢 LOW'}`)

      console.log('\n' + '='.repeat(80))

    } catch (error) {
      console.error(`❌ Error analyzing ${perspective}:`, error.message)
    }
  }

  console.log('\n\n🎯 FINAL RECOMMENDATION:\n')
  console.log('Based on the analysis above, choose the tier system that best matches your data:')
  console.log('  1. If top ~20% contributes ~80%: Use 80-15-5 (current system)')
  console.log('  2. If distribution is more spread: Use 70-20-10')
  console.log('  3. If you need granular control: Use 4-tier (60-20-15-5)')
  console.log('\nUpdate the thresholds in lib/utils/tierClassification.ts accordingly.\n')
}

// Run analysis
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
