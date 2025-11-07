import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../lib/services/bigquery'
import { getDailyOpsPublisherQueries } from '../../../../lib/services/analyticsQueries'

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json()

    console.log('[Daily Ops Publisher Summary] Filters received:', filters)

    // Get all queries (async to handle team filter conversion via Supabase)
    const queries = await getDailyOpsPublisherQueries(filters)

    console.log('[Daily Ops Publisher Summary] Executing 7 queries...')

    // Execute queries individually to catch which one fails
    let publisherSummary, publisherDetail, mediaSummary, mediaDetail, newZones, highTrafficZones, closeWonCases

    try {
      console.log('[1/7] Executing publisherSummary...')
      console.log('📝 Publisher Summary Query:', queries.publisherSummary)
      publisherSummary = await BigQueryService.executeQuery(queries.publisherSummary)
    } catch (error) {
      console.error('❌ publisherSummary FAILED')
      console.error('Query:', queries.publisherSummary)
      throw error
    }

    try {
      console.log('[2/7] Executing publisherDetail...')
      publisherDetail = await BigQueryService.executeQuery(queries.publisherDetail)
    } catch (error) {
      console.error('❌ publisherDetail FAILED')
      console.error('Query:', queries.publisherDetail)
      throw error
    }

    try {
      console.log('[3/7] Executing mediaSummary...')
      console.log('📝 Media Summary Query:', queries.mediaSummary)
      mediaSummary = await BigQueryService.executeQuery(queries.mediaSummary)
    } catch (error) {
      console.error('❌ mediaSummary FAILED')
      console.error('Query:', queries.mediaSummary)
      throw error
    }

    try {
      console.log('[4/7] Executing mediaDetail...')
      mediaDetail = await BigQueryService.executeQuery(queries.mediaDetail)
    } catch (error) {
      console.error('❌ mediaDetail FAILED')
      console.error('Query:', queries.mediaDetail)
      throw error
    }

    try {
      console.log('[5/7] Executing newZones...')
      newZones = await BigQueryService.executeQuery(queries.newZones)
    } catch (error) {
      console.error('❌ newZones FAILED')
      console.error('Query:', queries.newZones)
      throw error
    }

    try {
      console.log('[6/7] Executing highTrafficZones...')
      highTrafficZones = await BigQueryService.executeQuery(queries.highTrafficZones)
    } catch (error) {
      console.error('❌ highTrafficZones FAILED')
      console.error('Query:', queries.highTrafficZones)
      throw error
    }

    try {
      console.log('[7/7] Executing closeWonCases...')
      closeWonCases = await BigQueryService.executeQuery(queries.closeWonCases)
    } catch (error) {
      console.error('❌ closeWonCases FAILED')
      console.error('Query:', queries.closeWonCases)
      throw error
    }

    console.log('[Daily Ops Publisher Summary] Results:')
    console.log('- Publisher Summary rows:', publisherSummary.length)
    console.log('- Publisher Detail rows:', publisherDetail.length)
    console.log('- Media Summary rows:', mediaSummary.length)
    console.log('- Media Detail rows:', mediaDetail.length)
    console.log('- New Zones rows:', newZones.length)
    console.log('- High Traffic Zones rows:', highTrafficZones.length)
    console.log('- Close Won Cases rows:', closeWonCases.length)
    console.log('📊 Publisher Summary sample:', publisherSummary.slice(0, 2))
    console.log('📊 Media Summary sample:', mediaSummary.slice(0, 2))

    return NextResponse.json({
      status: 'ok',
      data: {
        publisherSummary,
        publisherDetail,
        mediaSummary,
        mediaDetail,
        newZones,
        highTrafficZones,
        closeWonCases
      }
    })
  } catch (error) {
    console.error('Error fetching daily ops publisher summary data:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
