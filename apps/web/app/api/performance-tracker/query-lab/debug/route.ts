import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../lib/services/bigquery'

/**
 * Debug API for Query Lab
 *
 * Runs diagnostic queries to find why queries return 0 rows
 */

const TABLE_NAME = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'

const WEB_GV_PICS = [
  'VN_anhtv', 'VN_chautt', 'VN_duonghm', 'VN_dungnt', 'VN_gianglt',
  'VN_hanhtt', 'VN_minhlh', 'VN_sonpv', 'VN_tuanla', 'VN_vietth'
]

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Query Lab Debug] Starting diagnostic queries...')

    // Test 1: Check date range in table
    console.log('[Debug] Test 1: Checking date range...')
    const dateRangeQuery = `
      SELECT
        MAX(date) as latest_date,
        MIN(date) as earliest_date,
        COUNT(*) as total_rows,
        COUNT(DISTINCT date) as distinct_dates
      FROM ${TABLE_NAME}
    `
    const dateRangeResult = await BigQueryService.executeQuery(dateRangeQuery)

    // Test 2: Check 6 months range
    console.log('[Debug] Test 2: Checking 6 months range...')
    const sixMonthsQuery = `
      SELECT
        DATE_SUB((SELECT MAX(date) FROM ${TABLE_NAME}), INTERVAL 6 MONTH) as from_date,
        (SELECT MAX(date) FROM ${TABLE_NAME}) as to_date,
        COUNT(*) as rows_in_range
      FROM ${TABLE_NAME}
      WHERE date BETWEEN DATE_SUB((SELECT MAX(date) FROM ${TABLE_NAME}), INTERVAL 6 MONTH)
        AND (SELECT MAX(date) FROM ${TABLE_NAME})
    `
    const sixMonthsResult = await BigQueryService.executeQuery(sixMonthsQuery)

    // Test 3: Check product = flexiblesticky
    console.log('[Debug] Test 3: Checking flexiblesticky product...')
    const productQuery = `
      SELECT
        COUNT(*) as flexiblesticky_rows,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(DISTINCT pic) as distinct_pics
      FROM ${TABLE_NAME}
      WHERE product = 'flexiblesticky'
    `
    const productResult = await BigQueryService.executeQuery(productQuery)

    // Test 4: Check PIC list for team WEB_GV
    console.log('[Debug] Test 4: Checking WEB_GV PICs...')
    const picQuery = `
      SELECT
        pic,
        COUNT(*) as row_count,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM ${TABLE_NAME}
      WHERE pic IN (${WEB_GV_PICS.map(p => `'${p}'`).join(', ')})
      GROUP BY pic
      ORDER BY pic
    `
    const picResult = await BigQueryService.executeQuery(picQuery)

    // Test 5: Check product = flexiblesticky with 6 months filter
    console.log('[Debug] Test 5: Checking flexiblesticky in last 6 months...')
    const productSixMonthsQuery = `
      SELECT
        COUNT(*) as rows_with_product_and_date
      FROM ${TABLE_NAME}
      WHERE date BETWEEN DATE_SUB((SELECT MAX(date) FROM ${TABLE_NAME}), INTERVAL 6 MONTH)
        AND (SELECT MAX(date) FROM ${TABLE_NAME})
        AND product = 'flexiblesticky'
    `
    const productSixMonthsResult = await BigQueryService.executeQuery(productSixMonthsQuery)

    // Test 6: Combined filters (all together)
    console.log('[Debug] Test 6: Checking all filters combined...')
    const combinedQuery = `
      SELECT
        COUNT(*) as final_count
      FROM ${TABLE_NAME}
      WHERE date BETWEEN DATE_SUB((SELECT MAX(date) FROM ${TABLE_NAME}), INTERVAL 6 MONTH)
        AND (SELECT MAX(date) FROM ${TABLE_NAME})
        AND product = 'flexiblesticky'
        AND pic IN (${WEB_GV_PICS.map(p => `'${p}'`).join(', ')})
    `
    const combinedResult = await BigQueryService.executeQuery(combinedQuery)

    // Analyze results and provide diagnosis
    const diagnosis = []

    if (dateRangeResult[0]) {
      const { latest_date, earliest_date } = dateRangeResult[0]
      diagnosis.push(`Table has data from ${earliest_date} to ${latest_date}`)
    }

    if (sixMonthsResult[0]) {
      const { from_date, to_date, rows_in_range } = sixMonthsResult[0]
      diagnosis.push(`6 months range: ${from_date} to ${to_date} has ${rows_in_range.toLocaleString()} rows`)

      if (rows_in_range === 0) {
        diagnosis.push('⚠️ PROBLEM: No data in 6 months range!')
      }
    }

    if (productResult[0]) {
      const { flexiblesticky_rows, earliest_date, latest_date } = productResult[0]
      diagnosis.push(`Product 'flexiblesticky' has ${flexiblesticky_rows.toLocaleString()} rows (${earliest_date} to ${latest_date})`)

      if (flexiblesticky_rows === 0) {
        diagnosis.push('⚠️ PROBLEM: No flexiblesticky product data!')
      }
    }

    if (picResult.length > 0) {
      diagnosis.push(`Found ${picResult.length}/${WEB_GV_PICS.length} PICs in table`)

      if (picResult.length < WEB_GV_PICS.length) {
        const foundPics = picResult.map((r: any) => r.pic)
        const missingPics = WEB_GV_PICS.filter(p => !foundPics.includes(p))
        diagnosis.push(`⚠️ Missing PICs: ${missingPics.join(', ')}`)
      }
    } else {
      diagnosis.push('⚠️ PROBLEM: No data for any WEB_GV PICs!')
    }

    if (productSixMonthsResult[0]) {
      const { rows_with_product_and_date } = productSixMonthsResult[0]
      diagnosis.push(`Flexiblesticky in last 6 months: ${rows_with_product_and_date.toLocaleString()} rows`)

      if (rows_with_product_and_date === 0) {
        diagnosis.push('⚠️ PROBLEM: No flexiblesticky data in last 6 months!')
      }
    }

    if (combinedResult[0]) {
      const { final_count } = combinedResult[0]
      diagnosis.push(`Final result with all filters: ${final_count.toLocaleString()} rows`)

      if (final_count === 0) {
        diagnosis.push('⚠️ ROOT CAUSE: All filters combined return 0 rows!')
      }
    }

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      status: 'success',
      results: {
        dateRange: dateRangeResult[0] || null,
        sixMonthsRange: sixMonthsResult[0] || null,
        productCheck: productResult[0] || null,
        picCheck: picResult,
        productSixMonthsCheck: productSixMonthsResult[0] || null,
        combinedCheck: combinedResult[0] || null
      },
      diagnosis,
      executionTime
    })

  } catch (error: any) {
    console.error('[Query Lab Debug] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Debug queries failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 })
}
