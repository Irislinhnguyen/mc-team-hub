/**
 * Export sticky zones to CSV
 */

import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_PATH = 'd:\\Downloads\\sticky_zones_need_update.csv'
const CREDENTIALS_PATH = path.join(__dirname, '..', 'service-account.json')
const PROJECT_ID = 'gcpp-check'

async function main() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
  const bigquery = new BigQuery({ projectId: PROJECT_ID, credentials })

  console.log('Querying sticky zones...')

  const [rows] = await bigquery.query({
    query: `
      SELECT
        zonename,
        product as current_product,
        pid,
        pubname,
        mid,
        medianame,
        H5
      FROM \`gcpp-check.GI_publisher.updated_product_name\`
      WHERE product = 'sticky'
      ORDER BY zonename
    `,
    location: 'US'
  })

  console.log(`Found ${rows.length} sticky zones`)

  // Write CSV
  const headers = ['zonename', 'current_product', 'pid', 'pubname', 'mid', 'medianame', 'H5']
  const csvContent = [
    headers.join(','),
    ...rows.map((row: any) =>
      headers.map(h => {
        const val = row[h]
        // Escape quotes and wrap in quotes if contains comma
        if (val === null || val === undefined) return ''
        const strVal = String(val)
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`
        }
        return strVal
      }).join(',')
    )
  ].join('\n')

  fs.writeFileSync(OUTPUT_PATH, csvContent, 'utf-8')
  console.log(`Exported to: ${OUTPUT_PATH}`)
}

main().catch(console.error)
