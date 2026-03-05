/**
 * Check if specific PIDs exist in BigQuery table
 */
import BigQueryService from '../lib/services/bigquery.js'

const PIDs_TO_CHECK = ['38491', '38407', '38479', '38432', '38385']

async function checkPIDsInBigQuery() {
  try {
    console.log('='.repeat(60))
    console.log('Checking PIDs in BigQuery table:')
    console.log('Table: gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month')
    console.log('='.repeat(60))

    for (const pid of PIDs_TO_CHECK) {
      const query = `
        SELECT
          pid,
          mid,
          COUNT(*) as record_count,
          SUM(rev) as total_revenue,
          MIN(DATE) as min_date,
          MAX(DATE) as max_date
        FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
        WHERE pid = ${pid}
        GROUP BY pid, mid
        ORDER BY mid
        LIMIT 10
      `

      console.log(`\n📊 PID ${pid}:`)
      console.log('-'.repeat(60))

      try {
        const rows = await BigQueryService.executeQuery(query)

        if (rows.length === 0) {
          console.log(`  ❌ NO RECORDS FOUND in BigQuery for PID ${pid}`)
          console.log(`  💡 This explains why impact calculation returns 0.00`)
        } else {
          console.log(`  ✓ Found ${rows.length} record group(s):`)
          rows.forEach(row => {
            console.log(`     - MID: ${row.mid || 'NULL'}, Records: ${row.record_count}, Revenue: $${row.total_revenue?.toFixed(2) || '0.00'}`)
            console.log(`       Date range: ${row.min_date} to ${row.max_date}`)
          })
        }
      } catch (error) {
        console.log(`  ⚠️ Query error: ${error.message}`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('Investigation complete')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

checkPIDsInBigQuery()
