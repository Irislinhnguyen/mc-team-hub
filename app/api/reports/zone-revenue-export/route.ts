/**
 * API Route: Zone Revenue Export
 * GET /api/reports/zone-revenue-export
 *
 * Exports zone performance data as CSV for specified zones and date range.
 * - Filters by zone IDs
 * - Filters by year/month
 * - Calculates: ad requests, revenue, eCPM, profit, revenue to publisher
 */

import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '@/lib/services/bigquery'

const DEFAULT_ZONE_IDS = [
  1597085, 1563812, 1595787, 1576115, 1589956, 1540243, 1581682,
  1596162, 1573617, 1538082, 1597122, 1597108, 1596109, 1588924,
  1542882, 1564344, 1567304, 1597309, 1596129, 1597447, 1574823
]

const DEFAULT_YEAR = 2025
const DEFAULT_MONTHS = [6, 7] // June, July

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const zonesParam = searchParams.get('zones')
    const yearParam = searchParams.get('year')
    const monthsParam = searchParams.get('months')

    // Use defaults or parse from query
    const zoneIds = zonesParam
      ? zonesParam.split(',').map(id => parseInt(id.trim(), 10))
      : DEFAULT_ZONE_IDS

    const year = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR
    const months = monthsParam
      ? monthsParam.split(',').map(m => parseInt(m.trim(), 10))
      : DEFAULT_MONTHS

    // Build BigQuery query - group by month to separate data
    const query = `
      SELECT
        month,
        zid,
        zonename,
        SUM(req) as ad_requests,
        SUM(rev) as revenue,
        AVG(request_CPM) as ecpm,
        SUM(profit) as profit,
        SUM(rev - profit) as revenue_to_publisher
      FROM \`gcpp-check.GI_publisher.pub_data\`
      WHERE year = ${year}
        AND month IN (${months.join(', ')})
        AND zid IN (${zoneIds.join(', ')})
      GROUP BY month, zid, zonename
      ORDER BY month, revenue DESC
    `

    console.log('[Zone Revenue Export] Executing query:', query)

    // Execute BigQuery query
    const results = await BigQueryService.executeQuery(query)

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: 'No data found for the specified criteria' },
        { status: 404 }
      )
    }

    // Generate CSV
    const headers = [
      'Month',
      'Zone ID',
      'Zone Name',
      'Ad Requests',
      'Revenue',
      'eCPM',
      'Profit',
      'Revenue to Publisher'
    ]

    const csvRows = [
      headers.join(','),
      ...results.map((row: any) => {
        const values = [
          row.month ?? '',
          row.zid ?? '',
          `"${(row.zonename ?? '').replace(/"/g, '""')}"`,
          row.ad_requests ?? 0,
          row.revenue ? row.revenue.toFixed(2) : '0.00',
          row.ecpm ? row.ecpm.toFixed(2) : '0.00',
          row.profit ? row.profit.toFixed(2) : '0.00',
          row.revenue_to_publisher ? row.revenue_to_publisher.toFixed(2) : '0.00'
        ]
        return values.join(',')
      })
    ]

    const csv = csvRows.join('\n')

    // Generate filename with date range
    const monthsStr = months.map(m => m.toString().padStart(2, '0')).join('-')
    const filename = `zone-revenue-${monthsStr}-${year}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('[Zone Revenue Export] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to export zone revenue data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
