/**
 * API Endpoint: POST /api/tools/tag-creation/generate-csv
 * Generates zone CSV file from natural language prompt using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/server'
import { generateZoneCSV } from '@/lib/services/tools/csvGeneratorService'

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { zoneUrl, prompt, payoutRate } = await request.json()

    if (!zoneUrl || zoneUrl.trim().length === 0) {
      return NextResponse.json({ error: 'Zone URL is required' }, { status: 400 })
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt is too long. Please keep it under 1000 characters.' },
        { status: 400 }
      )
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

    console.log(`[Generate CSV API] User ${user.id} generating zones`)
    console.log(`[Generate CSV API] Zone URL: ${zoneUrl}`)
    console.log(`[Generate CSV API] Prompt: ${prompt}`)
    console.log(`[Generate CSV API] Payout Rate: ${payoutRate}`)

    const { buffer, zones } = await generateZoneCSV(zoneUrl, prompt, payoutRate)

    // Return JSON response with zones (for client-side storage) and buffer as base64 (for optional download)
    return NextResponse.json({
      success: true,
      zones: zones,
      buffer: buffer.toString('base64'),
    })
  } catch (error: any) {
    console.error('[Generate CSV API] Error:', error)

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
