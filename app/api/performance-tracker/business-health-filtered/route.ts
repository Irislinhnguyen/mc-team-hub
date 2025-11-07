import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { buildWhereClause, getBusinessHealthQueries } from '../../../../lib/services/analyticsQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()
    const whereClause = await buildWhereClause(filters)

    const queries = getBusinessHealthQueries(whereClause)

    // Execute all queries in parallel
    const [metrics, timeSeries, publishers, media, zones, ecpm, zoneMonitoring, profitRate, productTrend, zoneMonitoringTimeSeries, listOfPid, listOfPidByDate] = await Promise.all([
      BigQueryService.executeQuery(queries.metrics),
      BigQueryService.executeQuery(queries.timeSeries),
      BigQueryService.executeQuery(queries.topPublishers),
      BigQueryService.executeQuery(queries.topMedia),
      BigQueryService.executeQuery(queries.topZones),
      BigQueryService.executeQuery(queries.topEcpm),
      BigQueryService.executeQuery(queries.zoneMonitoring),
      BigQueryService.executeQuery(queries.profitRate),
      BigQueryService.executeQuery(queries.productTrend),
      BigQueryService.executeQuery(queries.zoneMonitoringTimeSeries),
      BigQueryService.executeQuery(queries.listOfPid),
      BigQueryService.executeQuery(queries.listOfPidByDate),
    ])

    // Helper function to safely parse BigQuery numbers
    const parseValue = (value: any): number => {
      if (value === null || value === undefined) return 0

      // BigQuery sometimes wraps values in objects like { value: "123" }
      const rawValue = value?.value !== undefined ? value.value : value

      // Convert to string and remove commas (e.g., "54,500" -> "54500")
      const stringValue = String(rawValue).replace(/,/g, '')

      const parsed = parseFloat(stringValue)
      return isNaN(parsed) ? 0 : parsed
    }

    // Transform top charts data to ensure numbers are properly formatted
    const transformedPublishers = publishers.map((row: any) => ({
      pubname: row.pubname,
      revenue: parseValue(row.revenue)
    }))

    const transformedMedia = media.map((row: any) => ({
      medianame: row.medianame,
      revenue: parseValue(row.revenue)
    }))

    const transformedZones = zones.map((row: any) => ({
      zonename: row.zonename,
      revenue: parseValue(row.revenue)
    }))

    const transformedEcpm = ecpm.map((row: any) => ({
      zonename: row.zonename,
      ecpm: parseValue(row.ecpm)
    }))

    return NextResponse.json({
      status: 'ok',
      data: {
        metrics: metrics[0] || {},
        timeSeries,
        topPublishers: transformedPublishers,
        topMedia: transformedMedia,
        topZones: transformedZones,
        topEcpm: transformedEcpm,
        zoneMonitoring,
        profitRate: profitRate[0]?.profit_rate || 0,
        productTrend,
        zoneMonitoringTimeSeries,
        listOfPid,
        listOfPidByDate,
      },
    })
  } catch (error) {
    console.error('Error fetching business health data:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
