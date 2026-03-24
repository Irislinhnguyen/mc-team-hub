/**
 * CSV Zone Parser Service
 * Parses zoneInfo.csv from ad system and maps to ExtractedZone interface
 */

import type { ExtractedZone } from '@query-stream-ai/types/tools'

// Required CSV columns from ad system
const REQUIRED_COLUMNS = [
  'zoneId',
  'zoneName',
  'mediaId',
  'mediaName',
  'publisherId'
] as const

// CSV row interface (raw from ad system)
interface CSVRow {
  zoneId: string
  zoneName: string
  mediaId: string
  mediaName: string
  publisherId: string
  [key: string]: string // Allow other columns
}

// Parsed CSV result
export interface ParsedCSVResult {
  zones: ExtractedZone[]
  publisherId: string
  mediaId: string
  mediaName: string
  count: number
}

// Validation result
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate CSV headers
 */
export function validateCSV(headers: string[]): ValidationResult {
  const errors: string[] = []
  const missingColumns: string[] = []

  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) {
      missingColumns.push(required)
    }
  }

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Parse CSV buffer to rows
 * Handles UTF-8 with or without BOM
 */
function parseCSVBuffer(buffer: Buffer): string[] {
  let content = buffer.toString('utf-8')

  // Remove UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1)
  }

  // Split by lines and filter empty lines
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  return lines
}

/**
 * Parse CSV line to values
 * Handles quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("")
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Push last value
  values.push(current)

  return values
}

/**
 * Map CSV row to ExtractedZone
 */
export function mapCSVRowToZone(row: CSVRow): ExtractedZone {
  return {
    zone_id: row.zoneId,
    zone_name: row.zoneName,
    size: '', // Not in CSV, will be filled in Step 3
    inventory_type: null,
    type: null,
    category: null,
    approval_status: null,
    impressions: null,
    ctr: null,
    revenue: null,
    ecpm: null,
    ad_source: null,
    // Optional fields for sheets sync
    payout_rate: undefined,
    floor_price: undefined,
    account: undefined,
  }
}

/**
 * Parse CSV file and return zones with metadata
 */
export async function parseCSV(buffer: Buffer): Promise<ParsedCSVResult> {
  try {
    const lines = parseCSVBuffer(buffer)

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows')
    }

    // Parse header row
    const headers = parseCSVLine(lines[0])

    // Validate headers
    const validation = validateCSV(headers)
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '))
    }

    // Parse data rows
    const zones: ExtractedZone[] = []
    let publisherId = ''
    let mediaId = ''
    let mediaName = ''

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])

      // Skip empty rows
      if (values.length === 0 || (values.length === 1 && values[0].trim() === '')) {
        continue
      }

      // Create row object
      const row: CSVRow = {
        zoneId: '',
        zoneName: '',
        mediaId: '',
        mediaName: '',
        publisherId: ''
      }

      // Map values to columns
      headers.forEach((header, index) => {
        if (index < values.length) {
          row[header] = values[index]?.trim() || ''
        }
      })

      // Skip rows without zoneId or zoneName
      if (!row.zoneId || !row.zoneName) {
        continue
      }

      // Extract publisherId from first valid row
      if (!publisherId && row.publisherId) {
        publisherId = row.publisherId
      }

      // Extract mediaId and mediaName from first valid row
      if (!mediaId && row.mediaId) {
        mediaId = row.mediaId
      }

      if (!mediaName && row.mediaName) {
        mediaName = row.mediaName
      }

      // Map to ExtractedZone
      zones.push(mapCSVRowToZone(row))
    }

    if (zones.length === 0) {
      throw new Error('No valid zones found in CSV file')
    }

    return {
      zones,
      publisherId,
      mediaId,
      mediaName,
      count: zones.length
    }
  } catch (error: any) {
    console.error('[CSV Parser] Error:', error)
    throw new Error(`Failed to parse CSV: ${error.message}`)
  }
}
