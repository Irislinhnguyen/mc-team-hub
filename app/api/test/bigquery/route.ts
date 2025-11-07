/**
 * Test BigQuery Connection & Explore Data
 * Lists datasets, tables, and sample data
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'datasets'
    const dataset = searchParams.get('dataset')
    const table = searchParams.get('table')

    console.log(`[Test BigQuery] Action: ${action}`)

    if (action === 'datasets') {
      return await listDatasets()
    }

    if (action === 'tables' && dataset) {
      return await listTables(dataset)
    }

    if (action === 'schema' && dataset && table) {
      return await getTableSchema(dataset, table)
    }

    if (action === 'sample' && dataset && table) {
      return await sampleTableData(dataset, table)
    }

    if (action === 'test') {
      return await testConnection()
    }

    return NextResponse.json({
      error: 'Invalid action',
      availableActions: ['datasets', 'tables', 'schema', 'sample', 'test'],
      params: {
        action: 'Action to perform',
        dataset: 'Dataset name (for tables, schema, sample)',
        table: 'Table name (for schema, sample)',
      },
    })
  } catch (error) {
    console.error('[Test BigQuery] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : 'Unknown',
      },
      { status: 500 }
    )
  }
}

async function testConnection() {
  console.log('[Test BigQuery] Testing connection...')
  const success = await BigQueryService.testConnection()

  if (success) {
    return NextResponse.json({
      status: 'success',
      message: 'BigQuery connection successful',
    })
  } else {
    return NextResponse.json(
      {
        status: 'failed',
        message: 'BigQuery connection failed',
      },
      { status: 500 }
    )
  }
}

async function listDatasets() {
  console.log('[Test BigQuery] Listing datasets...')

  const client = BigQueryService.getInstance()
  const [datasets] = await client.getDatasets()

  return NextResponse.json({
    status: 'success',
    datasets: datasets.map((ds) => ({
      id: ds.id,
      projectId: ds.projectId,
      location: ds.location,
    })),
    count: datasets.length,
  })
}

async function listTables(datasetId: string) {
  console.log(`[Test BigQuery] Listing tables in ${datasetId}...`)

  const tables = await BigQueryService.listTables()

  return NextResponse.json({
    status: 'success',
    dataset: datasetId,
    tables: tables,
    count: tables.length,
  })
}

async function getTableSchema(datasetId: string, tableId: string) {
  console.log(`[Test BigQuery] Getting schema for ${datasetId}.${tableId}...`)

  const tableInfo = await BigQueryService.getTableInfo(tableId)

  return NextResponse.json({
    status: 'success',
    table: `${tableInfo.project}.${tableInfo.dataset}.${tableInfo.table}`,
    numRows: tableInfo.numRows,
    numBytes: tableInfo.numBytes,
    schema: tableInfo.schema,
    sizeInGB: (tableInfo.numBytes / 1024 / 1024 / 1024).toFixed(2),
  })
}

async function sampleTableData(datasetId: string, tableId: string) {
  console.log(`[Test BigQuery] Sampling data from ${datasetId}.${tableId}...`)

  const query = `SELECT * FROM \`${datasetId}.${tableId}\` LIMIT 10`

  const rows = await BigQueryService.executeQuery(query)

  return NextResponse.json({
    status: 'success',
    table: `${datasetId}.${tableId}`,
    rowCount: rows.length,
    sampleData: rows,
  })
}
