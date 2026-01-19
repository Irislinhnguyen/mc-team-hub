/**
 * Script to check the updated_product_name table in BigQuery
 */

import { BigQueryService } from '../lib/services/bigquery'

async function main() {
  try {
    console.log('=== Checking updated_product_name table ===\n')

    // First, let's see the schema
    const schemaQuery = `
      SELECT * EXCEPT (*)
      FROM \`your-project-id.geniee.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'updated_product_name'
    `

    // Get table info using the service
    const client = BigQueryService.getInstance()

    // Try to query a sample of the table
    const sampleQuery = `
      SELECT *
      FROM \`geniee.updated_product_name\`
      LIMIT 100
    `

    console.log('Executing sample query...')
    const rows = await BigQueryService.executeQuery(sampleQuery)

    console.log('\n=== Schema (inferred from first row) ===')
    if (rows.length > 0) {
      console.log('Columns:', Object.keys(rows[0]))
      console.log('\n=== Sample Data ===')
      console.log(JSON.stringify(rows.slice(0, 10), null, 2))
    } else {
      console.log('Table is empty or does not exist')
    }

  } catch (error: any) {
    console.error('Error:', error.message)
    console.error('\nFull error:', error)
  }
}

main()
