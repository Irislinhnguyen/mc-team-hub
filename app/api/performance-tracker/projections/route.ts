import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildWhereClause, getProjectionQueries } from '../../../../lib/services/analyticsQueries'
import { hierarchicalSort } from '../../../../lib/utils/hierarchicalSort'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()
    // Skip date filter because weekly_prediction_table doesn't have DATE column
    const whereClause = await buildWhereClause(filters, { skipDateFilter: true })

    // Get all three types of predictions in parallel
    const pidQueries = getProjectionQueries('pid', whereClause)
    const midQueries = getProjectionQueries('mid', whereClause)
    const zidQueries = getProjectionQueries('zid', whereClause)

    const [pidDataRaw, midDataRaw, zidDataRaw] = await Promise.all([
      BigQueryService.executeQuery(pidQueries.predictions),
      BigQueryService.executeQuery(midQueries.predictions),
      BigQueryService.executeQuery(zidQueries.predictions),
    ])

    // Apply hierarchical sorting
    const pidData = hierarchicalSort(pidDataRaw, 'pic', 'pid', 'last_month_profit')
    const midData = hierarchicalSort(midDataRaw, 'pid', 'mid', 'last_month_profit')
    const zidData = hierarchicalSort(zidDataRaw, 'mid', 'zid', 'last_month_profit')

    // Helper function to safely parse BigQuery numbers
    const parseValue = (value: any): number => {
      if (value === null || value === undefined) return 0
      const rawValue = value?.value !== undefined ? value.value : value
      const stringValue = String(rawValue).replace(/,/g, '')
      const parsed = parseFloat(stringValue)
      return isNaN(parsed) ? 0 : parsed
    }

    // Calculate grand totals for each dataset
    const calculateGrandTotal = (data: any[]) => {
      return data.reduce(
        (acc, row) => ({
          last_month_profit: acc.last_month_profit + parseValue(row.last_month_profit),
          w1_profit: acc.w1_profit + parseValue(row.w1_profit),
          w2_profit: acc.w2_profit + parseValue(row.w2_profit),
          w3_profit: acc.w3_profit + parseValue(row.w3_profit),
          w4_profit: acc.w4_profit + parseValue(row.w4_profit),
          w5_profit: acc.w5_profit + parseValue(row.w5_profit),
          mom_profit: acc.mom_profit + parseValue(row.mom_profit),
          wow_profit: acc.wow_profit + parseValue(row.wow_profit),
          last_month_rev: acc.last_month_rev + parseValue(row.last_month_rev),
          w1_rev: acc.w1_rev + parseValue(row.w1_rev),
          w2_rev: acc.w2_rev + parseValue(row.w2_rev),
          w3_rev: acc.w3_rev + parseValue(row.w3_rev),
          w4_rev: acc.w4_rev + parseValue(row.w4_rev),
          w5_rev: acc.w5_rev + parseValue(row.w5_rev),
          mom_rev: acc.mom_rev + parseValue(row.mom_rev),
          wow_rev: acc.wow_rev + parseValue(row.wow_rev),
        }),
        {
          last_month_profit: 0,
          w1_profit: 0,
          w2_profit: 0,
          w3_profit: 0,
          w4_profit: 0,
          w5_profit: 0,
          mom_profit: 0,
          wow_profit: 0,
          last_month_rev: 0,
          w1_rev: 0,
          w2_rev: 0,
          w3_rev: 0,
          w4_rev: 0,
          w5_rev: 0,
          mom_rev: 0,
          wow_rev: 0,
        }
      )
    }

    const pidGrandTotal = calculateGrandTotal(pidData)
    const midGrandTotal = calculateGrandTotal(midData)
    const zidGrandTotal = calculateGrandTotal(zidData)

    return NextResponse.json({
      status: 'ok',
      data: {
        pidPredictions: pidData,
        midPredictions: midData,
        zidPredictions: zidData,
        pidGrandTotal,
        midGrandTotal,
        zidGrandTotal,
      },
    })
  } catch (error) {
    console.error('Error fetching projections data:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
