/**
 * Check BigQuery table schema and sample data
 */

import { BigQuery } from '@google-cloud/bigquery'

const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})

async function checkSchema() {
  console.log('🔍 Checking BigQuery Table Schema\n')
  console.log('='.repeat(80))

  const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`'

  // Get table metadata
  console.log('\n📋 Table Schema:')
  console.log('─'.repeat(80))

  const schemaQuery = `
    SELECT column_name, data_type
    FROM \`gcpp-check.GI_publisher.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'agg_monthly_with_pic_table_6_month'
    ORDER BY ordinal_position
  `

  try {
    const [schemaRows] = await bigquery.query({ query: schemaQuery })
    console.log('\nAvailable columns:')
    schemaRows.forEach(row => {
      console.log(`  - ${row.column_name.padEnd(20)} : ${row.data_type}`)
    })
  } catch (error) {
    console.log('❌ Could not fetch schema:', error.message)
  }

  // Sample data
  console.log('\n\n📊 Sample Data (5 rows):')
  console.log('─'.repeat(80))

  const sampleQuery = `
    SELECT *
    FROM ${tableName}
    WHERE DATE >= '2024-12-01' AND DATE <= '2024-12-31'
    LIMIT 5
  `

  try {
    const [sampleRows] = await bigquery.query({ query: sampleQuery })
    console.log(`\nFound ${sampleRows.length} sample rows`)
    if (sampleRows.length > 0) {
      console.log('\nFirst row:')
      console.log(JSON.stringify(sampleRows[0], null, 2))
    }
  } catch (error) {
    console.log('❌ Could not fetch sample data:', error.message)
  }

  // Check unique values for key fields
  console.log('\n\n📈 Unique Values Count:')
  console.log('─'.repeat(80))

  const uniqueQuery = `
    SELECT
      COUNT(DISTINCT pic) as unique_pics,
      COUNT(DISTINCT pid) as unique_pids,
      COUNT(DISTINCT mid) as unique_mids,
      COUNT(DISTINCT product) as unique_products,
      COUNT(DISTINCT zid) as unique_zones,
      COUNT(*) as total_rows
    FROM ${tableName}
    WHERE DATE >= '2024-12-01' AND DATE <= '2024-12-31'
  `

  try {
    const [uniqueRows] = await bigquery.query({ query: uniqueQuery })
    if (uniqueRows.length > 0) {
      const stats = uniqueRows[0]
      console.log(`\n  Unique PICs:     ${stats.unique_pics}`)
      console.log(`  Unique PIDs:     ${stats.unique_pids}`)
      console.log(`  Unique MIDs:     ${stats.unique_mids}`)
      console.log(`  Unique Products: ${stats.unique_products}`)
      console.log(`  Unique Zones:    ${stats.unique_zones}`)
      console.log(`  Total Rows:      ${stats.total_rows}`)
    }
  } catch (error) {
    console.log('❌ Could not fetch unique counts:', error.message)
  }

  // Check if there's revenue data
  console.log('\n\n💰 Revenue Data Check:')
  console.log('─'.repeat(80))

  const revenueQuery = `
    SELECT
      MIN(DATE) as min_date,
      MAX(DATE) as max_date,
      SUM(rev) as total_revenue,
      SUM(req) as total_requests,
      COUNT(*) as row_count
    FROM ${tableName}
    WHERE DATE >= '2024-11-01' AND DATE <= '2024-12-31'
  `

  try {
    const [revenueRows] = await bigquery.query({ query: revenueQuery })
    if (revenueRows.length > 0) {
      const stats = revenueRows[0]
      console.log(`\n  Date Range:     ${stats.min_date?.value || 'N/A'} to ${stats.max_date?.value || 'N/A'}`)
      console.log(`  Total Revenue:  $${stats.total_revenue?.toFixed(2) || 0}`)
      console.log(`  Total Requests: ${stats.total_requests?.toLocaleString() || 0}`)
      console.log(`  Row Count:      ${stats.row_count}`)
    }
  } catch (error) {
    console.log('❌ Could not fetch revenue data:', error.message)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Schema check complete!')
}

checkSchema().catch(console.error)
