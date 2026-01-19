/**
 * Upload CSV to BigQuery and update product_name table
 */

import { BigQuery } from '@google-cloud/bigquery'
import { BigQueryService } from '../lib/services/bigquery'
import fs from 'fs'

const CSV_PATH = 'c:\\Users\\Admin\\Downloads\\Zone monitoring by date-2026-01-12.csv'
const TEMP_TABLE = 'temp_zone_mapping_20250116'

async function uploadCSVAndUpdate() {
  const client = BigQueryService.getInstance()

  console.log('=== Step 1: Upload CSV to BigQuery ===')

  // Read CSV content
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')

  // Create temp table with CSV data
  const dataset = client.dataset('GI_publisher')
  const table = dataset.table(TEMP_TABLE)

  // Define schema
  const schema = [
    { name: 'date', type: 'DATE' },
    { name: 'pic', type: 'STRING' },
    { name: 'pid', type: 'INTEGER' },
    { name: 'mid', type: 'INTEGER' },
    { name: 'zid', type: 'INTEGER' },
    { name: 'zonename', type: 'STRING' },
    { name: 'product', type: 'STRING' },
    { name: 'req', type: 'INTEGER' },
    { name: 'fill_rate', type: 'FLOAT' },
    { name: 'request_CPM', type: 'FLOAT' },
    { name: 'rev', type: 'FLOAT' },
    { name: 'profit', type: 'FLOAT' },
    { name: 'rev_to_pub', type: 'FLOAT' },
    { name: 'rn', type: 'INTEGER' }
  ]

  console.log(`Creating table: GI_publisher.${TEMP_TABLE}`)

  // Load CSV
  await table.insert(csvContent, {
    schema: schema,
    skipLeadingRows: 1,
    format: 'csv'
  })

  console.log('CSV uploaded successfully!')

  console.log('\n=== Step 2: Update product_name using JOIN ===')

  // Update using JOIN with temp table
  const updateSQL = `
    UPDATE \`GI_publisher.updated_product_name\` t
    SET product = tmp.product
    FROM \`GI_publisher.${TEMP_TABLE}\` tmp
    WHERE t.zonename = tmp.zonename
  `

  console.log('Executing UPDATE...')
  const result = await BigQueryService.executeQuery(updateSQL)
  console.log('Update completed!')

  console.log('\n=== Step 3: Verify results ===')

  // Check how many rows were updated
  const verifySQL = `
    SELECT
      (SELECT COUNT(*) FROM \`GI_publisher.updated_product_name\` WHERE product = 'sticky') as sticky_count,
      (SELECT COUNT(DISTINCT zonename) FROM \`GI_publisher.${TEMP_TABLE}\`) as unique_zonenames_in_csv
  `

  const verifyResult = await BigQueryService.executeQuery(verifySQL)
  console.log('Verification:', verifyResult)

  console.log('\n=== Step 4: Clean up temp table (optional) ===')
  console.log(`Run manually: DROP TABLE \`GI_publisher.${TEMP_TABLE}\``)
}

uploadCSVAndUpdate().catch(console.error)
