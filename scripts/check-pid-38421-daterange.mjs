/**
 * Check if PID 38421 has revenue data in the specific date range
 * that the impact calculation would query
 */

import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  keyFilename: './service-account.json',
  projectId: 'gcpp-check'
});

const PID = 38421;
const START_DATE = '2026-01-31';  // Pipeline's starting_date
const END_DATE = '2026-02-29';     // 30 days after starting_date

async function checkDateRange() {
  console.log(`\n========== Checking PID ${PID} for Date Range: ${START_DATE} to ${END_DATE} ==========\n`)

  // Query: What the impact calculation would run (PID-only)
  const query = `
    SELECT
      pid,
      COUNT(*) as record_count,
      SUM(rev) as total_revenue,
      MIN(DATE) as earliest_date,
      MAX(DATE) as latest_date
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE pid = ${PID}
    AND DATE >= '${START_DATE}'
    AND DATE <= '${END_DATE}'
    GROUP BY pid
  `

  console.log('Query (PID-only, same as impact calculation):')
  console.log(query)
  console.log()

  try {
    const [job] = await bigquery.createQueryJob({ query })
    const [results] = await job.getQueryResults()

    if (results.length === 0) {
      console.log(`❌ NO DATA FOUND for PID ${PID} in date range ${START_DATE} to ${END_DATE}`)
      console.log('\nThis is why the impact calculation returns 0!')
    } else {
      console.log(`✓ Found data for PID ${PID}:`)
      console.table(results)
    }
  } catch (error) {
    console.error('Error executing query:', error.message)
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // For comparison: Check what date ranges actually have data
  const query2 = `
    SELECT
      DATE,
      SUM(rev) as daily_revenue
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE pid = ${PID}
    GROUP BY DATE
    ORDER BY DATE DESC
    LIMIT 40
  `

  console.log('For comparison: Actual data available by date (most recent 40 days):')
  console.log(query2)
  console.log()

  try {
    const [job2] = await bigquery.createQueryJob({ query: query2 })
    const [results2] = await job2.getQueryResults()

    if (results2.length === 0) {
      console.log(`❌ No data found at all`)
    } else {
      console.log(`✓ Found ${results2.length} days with data:`)
      console.table(results2)

      // Highlight the issue
      const latestDate = results2[0].DATE.value
      console.log(`\n⚠️  LATEST data date: ${latestDate}`)
      console.log(`⚠️  Pipeline starting_date: ${START_DATE}`)
      console.log(`⚠️  Result: Query looks for data from ${START_DATE}, but latest data is from ${latestDate}`)
    }
  } catch (error) {
    console.error('Error executing query:', error.message)
  }

  console.log('\n' + '='.repeat(60) + '\n')
}

checkDateRange().catch(console.error)
