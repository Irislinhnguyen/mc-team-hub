import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json()

    // Get summary metrics for the selected date range
    const metricsQuery = `
      SELECT
        SUM(rev) as total_revenue,
        SUM(profit) as total_profit,
        SUM(paid) as total_paid,
        SUM(req) as total_requests,
        COUNT(DISTINCT DATE) as days_in_range
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE >= '${startDate}' AND DATE <= '${endDate}'
    `

    // Get time-series data for revenue and profit over time
    const timeSeriesQuery = `
      SELECT
        DATE as date,
        SUM(rev) as revenue,
        SUM(profit) as profit
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE >= '${startDate}' AND DATE <= '${endDate}'
      GROUP BY DATE
      ORDER BY DATE ASC
    `

    // Get top 10 publishers by revenue
    const publishersQuery = `
      SELECT
        pubname,
        SUM(rev) as revenue
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE >= '${startDate}' AND DATE <= '${endDate}'
      GROUP BY pubname
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Get top 10 media by revenue
    const mediaQuery = `
      SELECT
        medianame,
        SUM(rev) as revenue
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE >= '${startDate}' AND DATE <= '${endDate}'
      GROUP BY medianame
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Get top 10 zones by revenue
    const zonesQuery = `
      SELECT
        zonename,
        SUM(rev) as revenue
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE >= '${startDate}' AND DATE <= '${endDate}'
      GROUP BY zonename
      ORDER BY revenue DESC
      LIMIT 10
    `

    // Get top 10 zones by eCPM
    const ecpmQuery = `
      SELECT
        zonename,
        AVG(CAST(ecpm as FLOAT64)) as ecpm
      FROM \`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month\`
      WHERE DATE >= '${startDate}' AND DATE <= '${endDate}'
      GROUP BY zonename
      ORDER BY ecpm DESC
      LIMIT 10
    `

    // Execute all queries in parallel
    const [metrics, timeSeries, publishers, media, zones, ecpm] = await Promise.all([
      BigQueryService.executeQuery(metricsQuery),
      BigQueryService.executeQuery(timeSeriesQuery),
      BigQueryService.executeQuery(publishersQuery),
      BigQueryService.executeQuery(mediaQuery),
      BigQueryService.executeQuery(zonesQuery),
      BigQueryService.executeQuery(ecpmQuery),
    ])

    return NextResponse.json({
      status: 'ok',
      data: {
        metrics: metrics[0] || {},
        timeSeries,
        topPublishers: publishers,
        topMedia: media,
        topZones: zones,
        topEcpm: ecpm,
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
