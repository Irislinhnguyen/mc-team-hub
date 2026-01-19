/**
 * Update zones with product = "video" to "video sticky"
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

  console.log('=== Finding zones with product = video ===')

  const [rows] = await bigquery.query({
    query: `
      SELECT zonename, product
      FROM \`gcpp-check.GI_publisher.updated_product_name\`
      WHERE LOWER(product) = 'video'
      ORDER BY zonename
      LIMIT 50
    `,
    ...options
  })

  console.log(`Found zones to update`)

  // Count total
  const [countRows] = await bigquery.query({
    query: `SELECT COUNT(*) as total FROM \`gcpp-check.GI_publisher.updated_product_name\` WHERE LOWER(product) = 'video'`,
    ...options
  })
  console.log(`Total: ${countRows[0].total} zones`)

  if (countRows[0].total === 0) {
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
      WHERE LOWER(product) = 'video'
    `,
    ...options
  })

  console.log(`Updated successfully`)

  // Verify
  const [verifyRows] = await bigquery.query({
    query: `SELECT COUNT(*) as count FROM \`gcpp-check.GI_publisher.updated_product_name\` WHERE LOWER(product) = 'video'`,
    ...options
  })
  console.log(`Remaining 'video': ${verifyRows[0].count}`)

  const [stickyRows] = await bigquery.query({
    query: `SELECT COUNT(*) as count FROM \`gcpp-check.GI_publisher.updated_product_name\` WHERE product = 'video sticky'`,
    ...options
  })
  console.log(`Total 'video sticky': ${stickyRows[0].count}`)
}

main().catch(console.error)
