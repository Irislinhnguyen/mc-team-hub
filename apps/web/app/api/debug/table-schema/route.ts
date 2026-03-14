import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const table = searchParams.get('table')

    if (!table) {
      return NextResponse.json({
        status: 'error',
        message: 'Table parameter is required'
      })
    }

    const tableInfo = await BigQueryService.getTableInfo(table)

    return NextResponse.json({
      status: 'ok',
      data: tableInfo
    })
  } catch (error) {
    console.error('[Table Schema API] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
