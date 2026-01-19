/**
 * Load CSV with "New product type" column and UPDATE product_name
 */

import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CSV_PATH = 'd:\\Downloads\\Zone name checking - Sheet1.csv'
const CREDENTIALS_PATH = path.join(__dirname, '..', 'service-account.json')
const TEMP_TABLE = `temp_new_product_${Date.now()}`
const DATASET = 'geniee'
const TARGET_DATASET = 'GI_publisher'
const PROJECT_ID = 'gcpp-check'

async function main() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
  const bigquery = new BigQuery({ projectId: PROJECT_ID, credentials })
  const options = { location: 'US' }

  console.log('=== Step 1: Create temp table ===')
  const tempTableRef = `${PROJECT_ID}.${DATASET}.${TEMP_TABLE}`

  await bigquery.query({
    query: `CREATE TABLE \`${tempTableRef}\` (zonename STRING, new_product_type STRING)`,
    ...options
  })
  console.log(`Created: ${tempTableRef}`)

  console.log('\n=== Step 2: Parse CSV and load data ===')

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = csvContent.split('\n')

  const mapping = new Map<string, string>()
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = line.split(',')
    if (fields.length >= 8) {
      const zonename = fields[5].replace(/"/g, '').trim()  // Column F
      const newProductType = fields[7].replace(/"/g, '').trim()  // Column H: "New product type"
      if (zonename && newProductType) {
        mapping.set(zonename, newProductType)
      }
    }
  }

  console.log(`Found ${mapping.size} unique zonename -> new_product_type mappings`)

  // Show unique product types
  const uniqueProducts = new Set(mapping.values())
  console.log(`Unique product types (${uniqueProducts.size}):`, Array.from(uniqueProducts))

  // Insert in batches
  const valuesList: string[] = []
  for (const [zonename, productType] of mapping.entries()) {
    const safeZonename = zonename.replace(/'/g, "''").replace(/\\/g, '\\\\')
    const safeProduct = productType.replace(/'/g, "''")
    valuesList.push(`('${safeZonename}', '${safeProduct}')`)
  }

  const batchSize = 500
  for (let i = 0; i < valuesList.length; i += batchSize) {
    const batch = valuesList.slice(i, i + batchSize)
    const insertSQL = `INSERT INTO \`${tempTableRef}\` (zonename, new_product_type) VALUES ${batch.join(', ')}`
    await bigquery.query({ query: insertSQL, ...options })
    console.log(`Inserted ${Math.min(i + batchSize, valuesList.length)}/${valuesList.length} rows`)
  }

  console.log('\n=== Step 3: UPDATE product_name using JOIN ===')

  const updateSQL = `
    UPDATE \`${PROJECT_ID}.${TARGET_DATASET}.updated_product_name\` t
    SET product = tmp.new_product_type
    FROM \`${tempTableRef}\` tmp
    WHERE t.zonename = tmp.zonename
  `

  await bigquery.query({ query: updateSQL, ...options })
  console.log('Update completed')

  console.log('\n=== Step 4: Verify ===')

  const [verifyRows] = await bigquery.query({
    query: `SELECT product, COUNT(*) as count FROM \`${PROJECT_ID}.${TARGET_DATASET}.updated_product_name\` GROUP BY product ORDER BY count DESC LIMIT 20`,
    ...options
  })

  console.log('\nProduct distribution:')
  for (const row of verifyRows) {
    console.log(`  ${row.product}: ${row.count}`)
  }

  console.log(`\n=== Done! ===`)
  console.log(`Temp table: ${tempTableRef}`)
  console.log(`To drop: DROP TABLE \`${tempTableRef}\``)
}

main().catch(console.error)
