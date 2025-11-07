import { NextRequest, NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'
import { buildWhereClause, getDailyOpsQueriesPaginated } from '../../../../lib/services/analyticsQueries'

// Initialize BigQuery with correct environment variables
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined

const bigquery = new BigQuery({
  projectId: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT,
  credentials,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filters = {}, queryType, offset = 0, limit = 500 } = body

    // Validate queryType
    const validQueryTypes = ['topMovers', 'topMoversDetails']
    if (!validQueryTypes.includes(queryType)) {
      return NextResponse.json({
        status: 'error',
        message: `Invalid queryType. Must be one of: ${validQueryTypes.join(', ')}`
      }, { status: 400 })
    }

    // Build WHERE clause from filters (skip date filter for top_movers_daily table)
    const whereClause = await buildWhereClause(filters, { skipDateFilter: true })

    // Get paginated queries
    const queries = getDailyOpsQueriesPaginated(whereClause, { offset, limit })

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

    // Execute both queries in parallel
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
    console.error('Error fetching paginated daily ops data:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch data'
    }, { status: 500 })
  }
}
