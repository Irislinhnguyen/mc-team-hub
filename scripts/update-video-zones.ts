/**
 * Update all zones with "video" (not "inread") to "video sticky"
 */

import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CREDENTIALS_PATH = path.join(__dirname, '..', 'service-account.json')
const PROJECT_ID = 'gcpp-check'

async function main() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
  const bigquery = new BigQuery({ projectId: PROJECT_ID, credentials })
  const options = { location: 'US' }

  console.log('=== Finding video zones (not inread) ===')

  const [rows] = await bigquery.query({
    query: `
      SELECT zonename, product
      FROM \`gcpp-check.GI_publisher.updated_product_name\`
      WHERE LOWER(zonename) LIKE '%video%'
      AND LOWER(zonename) NOT LIKE '%inread%'
      AND product != 'video sticky'
      ORDER BY zonename
    `,
    ...options
  })

  console.log(`Found ${rows.length} zones to update`)

  if (rows.length === 0) {
    console.log('No zones to update!')
    return
  }

  // Show sample
  console.log('\nSample zones:')
  rows.slice(0, 10).forEach((r: any) => console.log(`  ${r.zonename} (${r.product})`))

  console.log('\n=== Updating to video sticky ===')

  await bigquery.query({
    query: `
      UPDATE \`gcpp-check.GI_publisher.updated_product_name\`
      SET product = 'video sticky'
      WHERE LOWER(zonename) LIKE '%video%'
      AND LOWER(zonename) NOT LIKE '%inread%'
    `,
    ...options
  })

  console.log(`Updated ${rows.length} zones`)

  // Verify
  const [verifyRows] = await bigquery.query({
    query: `SELECT product, COUNT(*) as count FROM \`gcpp-check.GI_publisher.updated_product_name\` WHERE product = 'video sticky'`,
    ...options
  })
  console.log(`\nTotal 'video sticky': ${verifyRows[0].count}`)
}

main().catch(console.error)
