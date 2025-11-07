import { BigQuery } from '@google-cloud/bigquery'
import { readFileSync } from 'fs'

// Load credentials from service-account.json
const credentials = JSON.parse(readFileSync('./service-account.json', 'utf8'))
const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  credentials
})

// Query to check data format - use last 30 days
const query = `
  SELECT
    pubname,
    SUM(rev) as revenue
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
  WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY pubname
  ORDER BY revenue DESC
  LIMIT 3
`

console.log('Executing query...')
const [rows] = await bigquery.query({ query, location: 'US' })

console.log('\n=== RAW BIGQUERY RESULTS ===')
console.log(JSON.stringify(rows, null, 2))

console.log('\n=== DATA TYPES ===')
if (rows.length > 0) {
  const row = rows[0]
  console.log('pubname type:', typeof row.pubname)
  console.log('pubname value:', row.pubname)
  console.log('revenue type:', typeof row.revenue)
  console.log('revenue value:', row.revenue)
  console.log('revenue is object?:', typeof row.revenue === 'object')
  if (typeof row.revenue === 'object' && row.revenue !== null) {
    console.log('revenue.value:', row.revenue.value)
    console.log('revenue keys:', Object.keys(row.revenue))
  }
  console.log('parseFloat(revenue):', parseFloat(row.revenue))
  console.log('parseFloat(String(revenue)):', parseFloat(String(row.revenue)))
}
