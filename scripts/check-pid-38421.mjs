/**
 * Check if PID 38421 exists in BigQuery revenue table
 */

import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  keyFilename: './service-account.json',
  projectId: 'gcpp-check'
});

const PID = 38421;

async function checkPid() {
  console.log(`\n========== Checking PID ${PID} in BigQuery ==========\n`)

  // Query 1: Check if PID exists at all
  const query1 = `
    SELECT
      pid,
      COUNT(*) as record_count,
      SUM(rev) as total_revenue,
      MIN(DATE) as earliest_date,
      MAX(DATE) as latest_date
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE pid = ${PID}
    GROUP BY pid
  `

  console.log('Query 1: Check if PID exists in BigQuery')
  console.log(query1)
  console.log()

  try {
    const [job1] = await bigquery.createQueryJob({ query: query1 })
    const [results1] = await job1.getQueryResults()

    if (results1.length === 0) {
      console.log(`❌ PID ${PID} NOT FOUND in BigQuery table`)
      console.log('This PID does not exist as a publisher in the revenue table.')
    } else {
      console.log(`✓ PID ${PID} FOUND in BigQuery`)
      console.table(results1)
    }
  } catch (error) {
    console.error('Error executing query:', error.message)
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // Query 2: Check recent revenue for this PID (last 90 days)
  const query2 = `
    SELECT
      DATE,
      rev,
      mid,
      zid
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE pid = ${PID}
    AND DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    ORDER BY DATE DESC
    LIMIT 20
  `

  console.log('Query 2: Recent revenue records (last 90 days, max 20 rows)')
  console.log(query2)
  console.log()

  try {
    const [job2] = await bigquery.createQueryJob({ query: query2 })
    const [results2] = await job2.getQueryResults()

    if (results2.length === 0) {
      console.log(`❌ No recent revenue records found for PID ${PID}`)
      console.log('Either the PID has no revenue in the last 90 days, or the date range is outside available data.')
    } else {
      console.log(`✓ Found ${results2.length} recent revenue records:`)
      console.table(results2)
    }
  } catch (error) {
    console.error('Error executing query:', error.message)
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // Query 3: Check all-time revenue for this PID
  const query3 = `
    SELECT
      COUNT(*) as total_records,
      SUM(rev) as total_revenue_all_time,
      MIN(DATE) as first_record,
      MAX(DATE) as last_record
    FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
    WHERE pid = ${PID}
  `

  console.log('Query 3: All-time summary for this PID')
  console.log(query3)
  console.log()

  try {
    const [job3] = await bigquery.createQueryJob({ query: query3 })
    const [results3] = await job3.getQueryResults()

    if (results3.length === 0) {
      console.log(`❌ No records found at all for PID ${PID}`)
    } else {
      console.log(`✓ All-time summary:`)
      console.table(results3)
    }
  } catch (error) {
    console.error('Error executing query:', error.message)
  }

  console.log('\n' + '='.repeat(60) + '\n')
}

checkPid().catch(console.error)
