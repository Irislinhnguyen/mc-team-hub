/**
 * Find Publishers with "app_" Products Without Revenue from June 2025
 *
 * This script queries BigQuery to find all publishers (PID, Pubname) that have
 * products starting with "app_" and don't have revenue from June 2025 onwards.
 *
 * Results: PID, Pubname
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function findAppProductPublishersNoRevenue() {
  try {
    console.log('='.repeat(80))
    console.log('Finding Publishers with app_ Products Without Revenue from June 2025')
    console.log('Table: gcpp-check.GI_publisher.agg_monthly_with_pic_table')
    console.log('Product Filter: Starts with "app_"')
    console.log('Date Range: Before 2025-06 vs 2025-06 onwards')
    console.log('='.repeat(80))
    console.log()

    console.log('🔍 Step 1: Querying BigQuery for publishers with app_ products...')
    console.log('-'.repeat(80))

    const { default: BigQueryService } = await import('../lib/services/bigquery.js')

    const query = `
      WITH publishers_before_jun2025 AS (
        -- Get publishers that HAD revenue BEFORE June 2025 with app_ products
        SELECT DISTINCT
          pid,
          pubname
        FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
        WHERE LOWER(product) LIKE 'app_%'
          AND (
            (year < 2025) OR
            (year = 2025 AND month < 6)
          )
          AND pid IS NOT NULL
      ),
      publishers_with_recent_revenue AS (
        -- Get publishers that HAVE revenue from June 2025 onwards with app_ products
        SELECT DISTINCT
          pid
        FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
        WHERE LOWER(product) LIKE 'app_%'
          AND (
            (year = 2025 AND month >= 6) OR
            (year = 2026 AND month <= 2)
          )
          AND pid IS NOT NULL
      )
      SELECT
        p.pid,
        p.pubname
      FROM publishers_before_jun2025 p
      WHERE p.pid NOT IN (SELECT pid FROM publishers_with_recent_revenue)
      ORDER BY p.pid
    `

    console.log(`📝 SQL Query:`)
    console.log(query)
    console.log()

    const rows = await BigQueryService.executeQuery(query)

    if (rows.length === 0) {
      console.log('✅ No publishers with app_ products found without revenue since June 2025')
    } else {
      console.log(`📊 Found ${rows.length} publishers with app_ products WITHOUT revenue since June 2025`)
      console.log()
      console.log('Results:')
      console.log('-'.repeat(80))

      // Display table header
      const pidWidth = 10
      const pubnameWidth = 80

      console.log(
        `${'PID'.padEnd(pidWidth)} | ${'Pubname'.padEnd(pubnameWidth)}`
      )
      console.log('-'.repeat(80))

      // Display each row
      rows.forEach((row, index) => {
        const pid = String(row.pid || '').padEnd(pidWidth)
        const pubname = String(row.pubname || '').substring(0, pubnameWidth).padEnd(pubnameWidth)

        console.log(`${pid} | ${pubname}`)

        // Add separator every 50 rows for readability
        if ((index + 1) % 50 === 0 && index < rows.length - 1) {
          console.log('-'.repeat(80))
        }
      })
    }

    console.log()
    console.log('='.repeat(80))
    console.log('Summary:')
    console.log(`  Total publishers with app_ products without revenue since June 2025: ${rows.length}`)
    console.log('='.repeat(80))

    // Step 2: Save to CSV
    console.log()
    console.log('💾 Step 2: Saving results to CSV...')
    console.log('-'.repeat(80))

    const csvFileName = 'app-product-publishers-no-revenue-since-jun2025.csv'
    const csvFilePath = path.join(projectRoot, csvFileName)

    // Create CSV content
    const csvHeader = 'PID,Pubname\n'
    const csvRows = rows.map(row => {
      const pid = row.pid || ''
      const pubname = `"${String(row.pubname || '').replace(/"/g, '""')}"`
      return `${pid},${pubname}`
    }).join('\n')

    const csvContent = csvHeader + csvRows

    // Write to file
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8')

    console.log(`✅ CSV saved to: ${csvFilePath}`)
    console.log(`📄 File name: ${csvFileName}`)
    console.log(`📊 Total rows: ${rows.length}`)
  } catch (error) {
    console.error('❌ Error executing query:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

findAppProductPublishersNoRevenue()
