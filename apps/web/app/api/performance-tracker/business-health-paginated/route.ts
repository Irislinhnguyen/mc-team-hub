import { NextRequest, NextResponse } from 'next/server'
import { getBigQueryClient } from '../../../../lib/services/bigquery'
import { buildWhereClause, getBusinessHealthQueries } from '../../../../lib/services/analyticsQueries'

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
    const { filters = {}, queryType, offset = 0, limit = 500 } = body

    // Validate queryType
    const validQueryTypes = ['zoneMonitoringTimeSeries', 'listOfPid', 'listOfPidByDate', 'listOfMid', 'listOfMidByDate']
    if (!validQueryTypes.includes(queryType)) {
      return NextResponse.json({
        status: 'error',
        message: `Invalid queryType. Must be one of: ${validQueryTypes.join(', ')}`
      }, { status: 400 })
    }

    // Build WHERE clause from filters
    const whereClause = await buildWhereClause(filters)

    // Get paginated queries
    const queries = getBusinessHealthQueries(whereClause, { offset, limit })

    // Get the specific query and its count query
    const dataQuery = queries[queryType as keyof typeof queries]
    const countQueryKey = `${queryType}Count` as keyof typeof queries
    const countQuery = queries[countQueryKey]

    if (!dataQuery || !countQuery) {
      return NextResponse.json({
        status: 'error',
        message: `Query type ${queryType} not found or doesn't support pagination`
      }, { status: 400 })
    }

    // Log the queries being executed for debugging
    console.log('Executing query:', queryType)
    console.log('Data query:', dataQuery)
    console.log('Count query:', countQuery)

    // Execute both queries in parallel
    const bigquery = getBigQueryClient()
    const [dataResult, countResult] = await Promise.all([
      bigquery.query({ query: dataQuery as string }),
      bigquery.query({ query: countQuery as string })
    ])

    const data = dataResult[0]
    const totalCount = countResult[0][0]?.total_count || 0

    return NextResponse.json({
      status: 'success',
      data: {
        rows: data,
        totalCount: parseInt(totalCount),
        offset,
        limit,
        hasMore: offset + data.length < parseInt(totalCount)
      }
    })
  } catch (error) {
    console.error('Error fetching paginated business health data:', error)
    console.error('Query type:', body?.queryType)
    console.error('Filters:', body?.filters)
    console.error('Error details:', error instanceof Error ? error.stack : error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch data',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 })
  }
}
