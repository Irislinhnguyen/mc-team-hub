/**
 * Update product = "sticky" using CSV column C (new name)
 */

import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CSV_PATH = 'd:\\Downloads\\sticky_zones_need_update.csv'
const CREDENTIALS_PATH = path.join(__dirname, '..', 'service-account.json')
const TEMP_TABLE = `temp_sticky_update_${Date.now()}`
const PROJECT_ID = 'gcpp-check'

async function main() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
  const bigquery = new BigQuery({ projectId: PROJECT_ID, credentials })
  const options = { location: 'US' }

  console.log('=== Step 1: Create temp table ===')
  const tempTableRef = `${PROJECT_ID}.geniee.${TEMP_TABLE}`

  await bigquery.query({
    query: `CREATE TABLE \`${tempTableRef}\` (zonename STRING, new_product STRING)`,
    ...options
  })

  console.log('\n=== Step 2: Parse CSV and load data ===')

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = csvContent.split('\n')

  const mapping = new Map<string, string>()
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = line.split(',')
    if (fields.length >= 3) {
      const zonename = fields[0].replace(/"/g, '').trim()  // Column A
      const newProduct = fields[2].replace(/"/g, '').trim()  // Column C: new name
      if (zonename && newProduct && newProduct !== '') {
        mapping.set(zonename, newProduct)
      }
    }
  }

  console.log(`Found ${mapping.size} mappings`)

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
    const insertSQL = `INSERT INTO \`${tempTableRef}\` (zonename, new_product) VALUES ${batch.join(', ')}`
    await bigquery.query({ query: insertSQL, ...options })
  }

  console.log('\n=== Step 3: UPDATE product ===')

  const updateSQL = `
    UPDATE \`gcpp-check.GI_publisher.updated_product_name\` t
    SET product = tmp.new_product
    FROM \`${tempTableRef}\` tmp
    WHERE t.zonename = tmp.zonename
  `

  await bigquery.query({ query: updateSQL, ...options })
  console.log('Update completed')

  // Verify
  const [stickyRows] = await bigquery.query({
    query: `SELECT COUNT(*) as count FROM \`gcpp-check.GI_publisher.updated_product_name\` WHERE product = 'sticky'`,
    ...options
  })
  console.log(`\nRemaining 'sticky': ${stickyRows[0].count}`)

  console.log(`\nTemp table: ${tempTableRef}`)
}

main().catch(console.error)
