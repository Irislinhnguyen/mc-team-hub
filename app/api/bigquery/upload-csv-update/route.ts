/**
 * Upload CSV and update product_name in BigQuery
 * POST /api/bigquery/upload-csv-update
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '@/lib/services/bigquery'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvData } = body

    if (!csvData) {
      return NextResponse.json({ error: 'csvData is required' }, { status: 400 })
    }

    // Parse CSV to get unique zonename -> product mapping
    const lines = csvData.split('\n')
    const mapping = new Map<string, string>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const fields = line.split(',')
      if (fields.length >= 7) {
        const zonename = fields[5].replace(/"/g, '').trim()
        const product = fields[6].replace(/"/g, '').trim()
        if (zonename && product) {
          mapping.set(zonename, product)
        }
      }
    }

    console.log(`Found ${mapping.size} unique zonename -> product mappings`)

    // Create temp table and insert data
    const timestamp = Date.now()
    const tempTable = `temp_zone_mapping_${timestamp}`

    // Step 1: Create temp table
    const createTableSQL = `
      CREATE TABLE \`GI_publisher.${tempTable}\` (
        zonename STRING,
        product STRING
      )
    `
    await BigQueryService.executeQuery(createTableSQL)
    console.log(`Created temp table: ${tempTable}`)

    // Step 2: Insert data using VALUES
    const valuesClauses: string[] = []
    for (const [zonename, product] of mapping.entries()) {
      const safeZonename = zonename.replace(/'/g, "''").replace(/\\/g, '\\\\')
      const safeProduct = product.replace(/'/g, "''")
      valuesClauses.push(`('${safeZonename}', '${safeProduct}')`)
    }

    // Batch insert (1000 rows at a time)
    const batchSize = 1000
    for (let i = 0; i < valuesClauses.length; i += batchSize) {
      const batch = valuesClauses.slice(i, i + batchSize)
      const insertSQL = `
        INSERT INTO \`GI_publisher.${tempTable}\` (zonename, product)
        VALUES ${batch.join(', ')}
      `
      await BigQueryService.executeQuery(insertSQL)
      console.log(`Inserted ${Math.min(i + batchSize, valuesClauses.length)}/${valuesClauses.length} rows`)
    }

    // Step 3: Update using JOIN
    const updateSQL = `
      UPDATE \`GI_publisher.updated_product_name\` t
      SET product = tmp.product
      FROM \`GI_publisher.${tempTable}\` tmp
      WHERE t.zonename = tmp.zonename
    `
    const updateResult = await BigQueryService.executeQuery(updateSQL)
    console.log('Update completed')

    // Step 4: Verify
    const verifySQL = `
      SELECT product, COUNT(*) as count
      FROM \`GI_publisher.updated_product_name\`
      GROUP BY product
      ORDER BY count DESC
    `
    const verifyResult = await BigQueryService.executeQuery(verifySQL)

    return NextResponse.json({
      status: 'ok',
      message: 'Update completed successfully',
      tempTable,
      mappingsCount: mapping.size,
      productDistribution: verifyResult
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
