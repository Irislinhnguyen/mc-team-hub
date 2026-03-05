/**
 * Analyze app_ Product Publishers with Low Revenue (< $10) - ALL TIME
 *
 * This script finds publishers with app_ products that have revenue < $10
 * for all time (entire dataset).
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function analyzeLowRevenuePublishersAllTime() {
  try {
    console.log('='.repeat(80))
    console.log('Analyzing app_ Product Publishers with Revenue < $10 - ALL TIME')
    console.log('Table: gcpp-check.GI_publisher.agg_monthly_with_pic_table')
    console.log('Product Filter: Starts with "app_"')
    console.log('Date Range: ALL TIME')
    console.log('Revenue Filter: < $10')
    console.log('='.repeat(80))
    console.log()

    const { default: BigQueryService } = await import('../lib/services/bigquery.js')

    const query = `
      WITH app_publishers_all_time AS (
        -- Get all publishers with app_ products and their total revenue (all time)
        SELECT
          pid,
          pubname,
          SUM(rev) as total_revenue,
          COUNT(DISTINCT mid) as num_mids,
          COUNT(DISTINCT product) as num_products,
          ARRAY_AGG(DISTINCT product) as products,
          MIN(year) as first_year,
          MAX(year) as last_year
        FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
        WHERE LOWER(product) LIKE 'app_%'
          AND pid IS NOT NULL
        GROUP BY pid, pubname
      )
      SELECT *
      FROM app_publishers_all_time
      WHERE total_revenue < 10
      ORDER BY total_revenue DESC, pid
    `

    console.log('🔍 Querying BigQuery for publishers with revenue < $10 (all time)...')
    console.log('-'.repeat(80))

    const rows = await BigQueryService.executeQuery(query)

    console.log(`✅ Found ${rows.length} publishers with app_ products and revenue < $10 (all time)`)
    console.log()

    if (rows.length > 0) {
      const pidWidth = 10
      const pubnameWidth = 55
      const revenueWidth = 12
      const yearWidth = 20

      console.log(`${'PID'.padEnd(pidWidth)} | ${'Pubname'.padEnd(pubnameWidth)} | ${'Revenue'.padEnd(revenueWidth)} | ${'Years Active'.padEnd(yearWidth)} | Products`)
      console.log('-'.repeat(80))

      rows.forEach(row => {
        const pid = String(row.pid || '').padEnd(pidWidth)
        const pubname = String(row.pubname || '').substring(0, pubnameWidth).padEnd(pubnameWidth)
        const revenue = `$${(row.total_revenue || 0).toFixed(2)}`.padEnd(revenueWidth)
        const years = `${row.first_year}-${row.last_year}`.padEnd(yearWidth)
        const products = (row.products || []).slice(0, 3).join(', ')

        console.log(`${pid} | ${pubname} | ${revenue} | ${years} | ${products}`)
      })
      console.log()

      console.log('='.repeat(80))
      console.log('Summary:')
      console.log(`  Total publishers with app_ products and revenue < $10 (all time): ${rows.length}`)

      // Calculate some stats
      const totalRev = rows.reduce((sum, r) => sum + (r.total_revenue || 0), 0)
      const avgRev = totalRev / rows.length

      console.log(`  Total revenue from these publishers: $${totalRev.toFixed(2)}`)
      console.log(`  Average revenue per publisher: $${avgRev.toFixed(2)}`)
      console.log('='.repeat(80))

      // Save to CSV
      console.log()
      console.log('💾 Saving results to CSV...')
      console.log('-'.repeat(80))

      const csvFileName = 'app-product-publishers-low-revenue-all-time.csv'
      const csvFilePath = path.join(projectRoot, csvFileName)

      const csvHeader = 'PID,Pubname,Total_Revenue,Num_MIDs,Num_Products,First_Year,Last_Year,Products\n'
      const csvRows = rows.map(row => {
        const pid = row.pid || ''
        const pubname = `"${String(row.pubname || '').replace(/"/g, '""')}"`
        const revenue = row.total_revenue || 0
        const numMids = row.num_mids || 0
        const numProducts = row.num_products || 0
        const firstYear = row.first_year || ''
        const lastYear = row.last_year || ''
        const products = `"${(row.products || []).join(', ').replace(/"/g, '""')}"`
        return `${pid},${pubname},${revenue},${numMids},${numProducts},${firstYear},${lastYear},${products}`
      }).join('\n')

      fs.writeFileSync(csvFilePath, csvHeader + csvRows, 'utf-8')
      console.log(`✅ CSV saved to: ${csvFileName} (${rows.length} rows)`)

    } else {
      console.log('✅ No publishers found with app_ products and revenue < $10 (all time)')
    }

  } catch (error) {
    console.error('❌ Error executing query:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

analyzeLowRevenuePublishersAllTime()
