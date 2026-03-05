/**
 * Analyze app_ Product Publishers: Before vs After June 2025
 *
 * This script shows which publishers with app_ products:
 * 1. Disappeared after June 2025
 * 2. Are still active after June 2025
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function analyzeAppProductPublishers() {
  try {
    console.log('='.repeat(80))
    console.log('Analyzing app_ Product Publishers: Before vs After June 2025')
    console.log('Table: gcpp-check.GI_publisher.agg_monthly_with_pic_table')
    console.log('Product Filter: Starts with "app_"')
    console.log('='.repeat(80))
    console.log()

    const { default: BigQueryService } = await import('../lib/services/bigquery.js')

    // Get publishers with app_ products before June 2025
    console.log('📊 Step 1: Finding publishers with app_ products before June 2025...')
    console.log('-'.repeat(80))

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
        p.pubname,
        CASE
          WHEN r.pid IS NOT NULL THEN 'still_active'
          ELSE 'disappeared'
        END as status
      FROM publishers_before_jun2025 p
      LEFT JOIN publishers_with_recent_revenue r ON p.pid = r.pid
      ORDER BY status DESC, p.pid
    `

    const rows = await BigQueryService.executeQuery(query)

    const disappeared = rows.filter(r => r.status === 'disappeared')
    const stillActive = rows.filter(r => r.status === 'still_active')

    console.log(`✅ Total publishers with app_ products before June 2025: ${rows.length}`)
    console.log(`  - Still active: ${stillActive.length}`)
    console.log(`  - Disappeared: ${disappeared.length}`)
    console.log()

    // Display disappeared publishers
    if (disappeared.length > 0) {
      console.log('❌ Publishers that DISAPPEARED after June 2025:')
      console.log('-'.repeat(80))
      const pidWidth = 10
      const pubnameWidth = 70

      console.log(`${'PID'.padEnd(pidWidth)} | ${'Pubname'.padEnd(pubnameWidth)}`)
      console.log('-'.repeat(80))

      disappeared.forEach(row => {
        const pid = String(row.pid || '').padEnd(pidWidth)
        const pubname = String(row.pubname || '').substring(0, pubnameWidth).padEnd(pubnameWidth)
        console.log(`${pid} | ${pubname}`)
      })
      console.log()
    }

    // Display still active publishers (sample)
    console.log('✅ Publishers that are STILL ACTIVE (showing first 50):')
    console.log('-'.repeat(80))
    const pidWidth = 10
    const pubnameWidth = 70

    console.log(`${'PID'.padEnd(pidWidth)} | ${'Pubname'.padEnd(pubnameWidth)}`)
    console.log('-'.repeat(80))

    stillActive.slice(0, 50).forEach(row => {
      const pid = String(row.pid || '').padEnd(pidWidth)
      const pubname = String(row.pubname || '').substring(0, pubnameWidth).padEnd(pubnameWidth)
      console.log(`${pid} | ${pubname}`)
    })

    if (stillActive.length > 50) {
      console.log(`... and ${stillActive.length - 50} more`)
    }
    console.log()

    console.log('='.repeat(80))
    console.log('Summary:')
    console.log(`  Total publishers with app_ products before June 2025: ${rows.length}`)
    console.log(`  ✓ Still active after June 2025: ${stillActive.length} (${((stillActive.length/rows.length)*100).toFixed(1)}%)`)
    console.log(`  ✗ Disappeared after June 2025: ${disappeared.length} (${((disappeared.length/rows.length)*100).toFixed(1)}%)`)
    console.log('='.repeat(80))

    // Save to CSV files
    console.log()
    console.log('💾 Step 2: Saving results to CSV files...')
    console.log('-'.repeat(80))

    // Save disappeared publishers
    if (disappeared.length > 0) {
      const disappearedFileName = 'app-product-publishers-disappeared.csv'
      const disappearedPath = path.join(projectRoot, disappearedFileName)

      const disappearedHeader = 'PID,Pubname\n'
      const disappearedRows = disappeared.map(row => {
        const pid = row.pid || ''
        const pubname = `"${String(row.pubname || '').replace(/"/g, '""')}"`
        return `${pid},${pubname}`
      }).join('\n')

      fs.writeFileSync(disappearedPath, disappearedHeader + disappearedRows, 'utf-8')
      console.log(`✅ Disappeared publishers: ${disappearedFileName} (${disappeared.length} rows)`)
    }

    // Save still active publishers
    const activeFileName = 'app-product-publishers-still-active.csv'
    const activePath = path.join(projectRoot, activeFileName)

    const activeHeader = 'PID,Pubname\n'
    const activeRows = stillActive.map(row => {
      const pid = row.pid || ''
      const pubname = `"${String(row.pubname || '').replace(/"/g, '""')}"`
      return `${pid},${pubname}`
    }).join('\n')

    fs.writeFileSync(activePath, activeHeader + activeRows, 'utf-8')
    console.log(`✅ Still active publishers: ${activeFileName} (${stillActive.length} rows)`)

  } catch (error) {
    console.error('❌ Error executing query:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

analyzeAppProductPublishers()
