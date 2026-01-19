/**
 * API Endpoint: POST /api/tools/tag-creation/extract-zones
 * Extracts zone data from screenshot using AI Vision
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/server'
import {
  extractZoneIdsFromScreenshot,
  validateExtractedZones,
} from '@/lib/services/tools/zoneExtractionService'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg']

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('screenshot') as File

    if (!file) {
      return NextResponse.json({ error: 'No screenshot uploaded' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Please upload PNG or JPG image. Got: ${file.type}`,
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds 10MB limit. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 }
      )
    }

    console.log(
      `[Extract Zones API] User ${user.id} extracting zones from ${file.name} (${file.type}, ${(file.size / 1024).toFixed(0)}KB)`
    )

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract zones using AI Vision
    const zones = await extractZoneIdsFromScreenshot(buffer, file.type)

    // Validate extracted data
    const validation = validateExtractedZones(zones)

    if (!validation.valid) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Extraction validation failed',
          zones,
          validationErrors: validation.errors,
        },
        { status: 400 }
      )
    }

    console.log(`[Extract Zones API] Successfully extracted ${zones.length} zones`)

    return NextResponse.json({
      status: 'success',
      zones,
      confidence: 0.95, // Vision API typically has high confidence for tables
      count: zones.length,
    })
  } catch (error: any) {
    console.error('[Extract Zones API] Error:', error)

    // Handle rate limiting
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Rate limit exceeded. Please wait a moment and try again.',
        },
        { status: 429 }
      )
    }

    // Handle invalid image
    if (error.message?.includes('image')) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Could not process image. Please ensure the screenshot is clear and shows the zone table.',
        },
        { status: 400 }
      )
    }

    // Handle no zones found
    if (error.message?.includes('No zones')) {
      return NextResponse.json(
        {
          status: 'error',
          error: error.message,
        },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to extract zones from screenshot',
      },
      { status: 500 }
    )
  }
}
