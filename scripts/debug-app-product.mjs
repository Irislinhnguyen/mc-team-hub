/**
 * Debug: Check app_ product publishers
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { default: BigQueryService } = await import('../lib/services/bigquery.js')

console.log('📊 Checking app_ product publishers...')
console.log('-'.repeat(80))

// Check before vs after June 2025
const query = `
  SELECT
    'Before Jun 2025' as period,
    COUNT(DISTINCT pid) as num_pubs,
    COUNT(DISTINCT product) as num_products
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE LOWER(product) LIKE 'app_%'
    AND (
      (year < 2025) OR
      (year = 2025 AND month < 6)
    )
  UNION ALL
  SELECT
    'Jun 2025 onwards' as period,
    COUNT(DISTINCT pid) as num_pubs,
    COUNT(DISTINCT product) as num_products
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE LOWER(product) LIKE 'app_%'
    AND (
      (year = 2025 AND month >= 6) OR
      (year >= 2026)
    )
`

const rows = await BigQueryService.executeQuery(query)
rows.forEach(row => {
  console.log(`${row.period}: ${row.num_pubs} publishers, ${row.num_products} products`)
})

console.log()
console.log('📊 Sample app_ products:')
console.log('-'.repeat(80))

const query2 = `
  SELECT DISTINCT product
  FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table\`
  WHERE LOWER(product) LIKE 'app_%'
  LIMIT 20
`

const rows2 = await BigQueryService.executeQuery(query2)
rows2.forEach(row => {
  console.log(`  - ${row.product}`)
})
