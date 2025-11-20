import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { getPublisherMonitoringQueries, getChurnedPublishersByPartnerQuery } from '../../../../lib/services/gcppQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()
    // Pass filters directly - function will handle table-specific WHERE clauses
    const queries = getPublisherMonitoringQueries(filters)
    const churnedPubsQuery = getChurnedPublishersByPartnerQuery(filters)

    const [
      newPubsByPartner,
      sharedPubsMonitoring,
      sharedPubsDetails,
      churnedPubsByPartner
    ] = await Promise.all([
      BigQueryService.executeQuery(queries.newPubsByPartner),
      BigQueryService.executeQuery(queries.sharedPubsMonitoring),
      BigQueryService.executeQuery(queries.sharedPubsDetails),
      BigQueryService.executeQuery(churnedPubsQuery)
    ])

    return NextResponse.json({
      status: 'ok',
      data: {
        newPubsByPartner,
        sharedPubsMonitoring,
        sharedPubsDetails,
        churnedPubsByPartner
      }
    })
  } catch (error: any) {
    console.error('Error fetching Publisher Monitoring data:', error)
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
