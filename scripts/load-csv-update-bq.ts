/**
 * Load CSV to BigQuery temp table and UPDATE product_name
 */

import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CSV_PATH = 'c:\\Users\\Admin\\Downloads\\Zone monitoring by date-2026-01-12.csv'
const CREDENTIALS_PATH = path.join(__dirname, '..', 'service-account.json')
const TEMP_TABLE = `temp_zone_mapping_${Date.now()}`
const DATASET = 'geniee'
const PROJECT_ID = 'gcpp-check'

async function main() {
  // Load credentials from service-account.json
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
  const bigquery = new BigQuery({ projectId: PROJECT_ID, credentials })
  const options = { location: 'US' }

  console.log('=== Step 1: Create temp table ===')
  const tempTableRef = `${PROJECT_ID}.${DATASET}.${TEMP_TABLE}`

  // Create temp table
  await bigquery.query({
    query: `
      CREATE TABLE \`${tempTableRef}\` (
        zonename STRING,
        product STRING
      )
    `,
    ...options
  })
  console.log(`Created: ${tempTableRef}`)

  console.log('\n=== Step 2: Load CSV into temp table ===')

  // Parse CSV and build INSERT statements
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = csvContent.split('\n')

  const mapping = new Map<string, string>()
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parse
    const fields = line.split(',')
    if (fields.length >= 7) {
      const zonename = fields[5].replace(/"/g, '').trim()
      const product = fields[6].replace(/"/g, '').trim()
      if (zonename && product) {
        mapping.set(zonename, product)
      }
    }
  }

  console.log(`Found ${mapping.size} unique mappings`)

  // Batch insert
  const valuesList: string[] = []
  for (const [zonename, product] of mapping.entries()) {
    const safeZonename = zonename.replace(/'/g, "''").replace(/\\/g, '\\\\')
    const safeProduct = product.replace(/'/g, "''")
    valuesList.push(`('${safeZonename}', '${safeProduct}')`)
  }

  // Insert in batches
  const batchSize = 500
  for (let i = 0; i < valuesList.length; i += batchSize) {
    const batch = valuesList.slice(i, i + batchSize)
    const insertSQL = `
      INSERT INTO \`${tempTableRef}\` (zonename, product)
      VALUES ${batch.join(', ')}
    `
    await bigquery.query({ query: insertSQL, ...options })
    console.log(`Inserted ${Math.min(i + batchSize, valuesList.length)}/${valuesList.length} rows`)
  }

  console.log('\n=== Step 3: UPDATE product_name using JOIN ===')

  const updateSQL = `
    UPDATE \`${PROJECT_ID}.${DATASET}.updated_product_name\` t
    SET product = tmp.product
    FROM \`${tempTableRef}\` tmp
    WHERE t.zonename = tmp.zonename
  `

  const [updateJob] = await bigquery.query({ query: updateSQL, ...options })
  console.log(`Updated ${updateJob[0]?.length || 'unknown'} rows`)

  console.log('\n=== Step 4: Verify ===')

  const [verifyRows] = await bigquery.query({
    query: `
      SELECT product, COUNT(*) as count
      FROM \`${PROJECT_ID}.${DATASET}.updated_product_name\`
      WHERE product = 'sticky'
      GROUP BY product
    `,
    ...options
  })

  console.log('Sticky count:', verifyRows)

  console.log(`\n=== Done! ===`)
  console.log(`Temp table: ${tempTableRef}`)
  console.log(`To drop: DROP TABLE \`${tempTableRef}\``)
}

main().catch(console.error)
