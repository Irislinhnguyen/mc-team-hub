/**
 * API Endpoint: POST /api/tools/tag-creation/parse-csv
 * Parses CSV file from ad system and returns zone data with publisherId for PID auto-fill
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@query-stream-ai/auth/server'
import { parseCSV } from '@/lib/services/tools/csvZoneParserService'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain']

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('csv') as File

    if (!file) {
      return NextResponse.json({ error: 'No CSV file uploaded' }, { status: 400 })
    }

    // Validate file type
    const fileType = file.type
    const fileName = file.name.toLowerCase()

    if (!ALLOWED_TYPES.includes(fileType) && !fileName.endsWith('.csv')) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Please upload a CSV file (.csv).',
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds 5MB limit. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 413 }
      )
    }

    console.log(
      `[Parse CSV API] User ${user.id} parsing CSV: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(0)}KB)`
    )

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse CSV
    const result = await parseCSV(buffer)

    console.log(`[Parse CSV API] Successfully parsed ${result.count} zones`)

    return NextResponse.json({
      status: 'success',
      zones: result.zones,
      publisherId: result.publisherId,
      mediaId: result.mediaId,
      mediaName: result.mediaName,
      count: result.count,
    })
  } catch (error: any) {
    console.error('[Parse CSV API] Error:', error)

    // Handle validation errors
    if (error.message?.includes('Missing required columns')) {
      return NextResponse.json(
        {
          status: 'error',
          error: error.message,
        },
        { status: 400 }
      )
    }

    // Handle empty CSV
    if (error.message?.includes('No valid zones')) {
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
        error: error.message || 'Failed to parse CSV file',
      },
      { status: 500 }
    )
  }
}
