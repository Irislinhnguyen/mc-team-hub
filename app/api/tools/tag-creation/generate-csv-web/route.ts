/**
 * API Endpoint: POST /api/tools/tag-creation/generate-csv-web
 * Generates zone CSV file for Team Web
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/server'
import { generateWebZoneCSV } from '@/lib/services/tools/csvGeneratorWebService'

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { mediaName, products, aiPrompt, payoutRate } = await request.json()

    if (!mediaName || mediaName.trim().length === 0) {
      return NextResponse.json({ error: 'Media name is required' }, { status: 400 })
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'At least one product is required' }, { status: 400 })
    }

    if (payoutRate === undefined || payoutRate === null) {
      return NextResponse.json({ error: 'Payout Rate is required' }, { status: 400 })
    }

    if (typeof payoutRate !== 'number' || payoutRate < 0 || payoutRate > 1) {
      return NextResponse.json(
        { error: 'Payout Rate must be a number between 0 and 1' },
        { status: 400 }
      )
    }

    console.log(`[Generate CSV Web API] User ${user.id} generating CSV for ${mediaName}`)
    console.log(`[Generate CSV Web API] Products: ${products.length}`)
    console.log(`[Generate CSV Web API] Has AI Prompt: ${!!aiPrompt}`)

    const { buffer, zoneCount } = await generateWebZoneCSV(
      { mediaName, products, aiPrompt },
      payoutRate
    )

    const filename = `zones_web_${Date.now()}.xlsx`

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Zone-Count': zoneCount.toString(),
      },
    })
  } catch (error: any) {
    console.error('[Generate CSV Web API] Error:', error)

    // Handle OpenAI API errors
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a moment and try again.',
        },
        { status: 429 }
      )
    }

    if (error.message?.includes('API key')) {
      return NextResponse.json(
        {
          error: 'OpenAI API configuration error. Please contact support.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to generate CSV',
      },
      { status: 500 }
    )
  }
}
