import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function POST(request: NextRequest) {
  try {
    const { table } = await request.json()

    // Get table schema and sample data
    const schemaQuery = `
      SELECT column_name, data_type
      FROM \`gcpp-check.GI_publisher.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = '${table}'
      ORDER BY ordinal_position
    `

    const sampleQuery = `
      SELECT *
      FROM \`gcpp-check.GI_publisher.${table}\`
      LIMIT 5
    `

    const [schema, sample] = await Promise.all([
      BigQueryService.executeQuery(schemaQuery),
      BigQueryService.executeQuery(sampleQuery),
    ])

    return NextResponse.json({
      status: 'ok',
      table,
      schema,
      sample,
    })
  } catch (error) {
    console.error('Error inspecting table:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
