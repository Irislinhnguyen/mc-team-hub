/**
 * CSV Parser Utility for Tag Creation Tool
 * Parses media_template CSV files for Step 0
 */

import type { MediaTemplateRow } from '@/lib/types/tools'

export interface CsvParseResult {
  success: boolean
  data?: MediaTemplateRow[]
  error?: string
}

/**
 * Parse CSV content for media template
 * Expected columns (case-insensitive):
 * - Publisher ID (required)
 * - Site/App Name (required)
 * - Site URL (required)
 * - Publisher Comment (optional)
 * - Vendor Comment (optional)
 */
export function parseMediaTemplateCsv(csvContent: string): CsvParseResult {
  try {
    // Normalize line endings
    const lines = csvContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter(line => line.trim())

    if (lines.length < 2) {
      return {
        success: false,
        error: 'CSV file must contain at least a header row and one data row',
      }
    }

    // Parse header
    const header = parseCsvLine(lines[0])
    const normalizedHeader = header.map(h => h.toLowerCase().trim())

    // Find column indices
    const publisherIdIdx = normalizedHeader.findIndex(h =>
      h === 'publisher id' || h === 'publisherid' || h === 'pid'
    )
    const siteAppNameIdx = normalizedHeader.findIndex(h =>
      h === 'site/app name' || h === 'site/appname' || h === 'siteapp name' ||
      h === 'site app name' || h === 'siteappname' || h === 'app name' ||
      h === 'appname' || h === 'site/app_name' || h === 'site/app-name'
    )
    const siteUrlIdx = normalizedHeader.findIndex(h =>
      h === 'site url' || h === 'siteurl' || h === 'site url' ||
      h === 'url' || h === 'site/url' || h === 'site-url'
    )
    const publisherCommentIdx = normalizedHeader.findIndex(h =>
      h === 'publisher comment' || h === 'publishercomment' || h === 'publisher comment'
    )
    const vendorCommentIdx = normalizedHeader.findIndex(h =>
      h === 'vendor comment' || h === 'vendorcomment' || h === 'vendor comment'
    )

    // Validate required columns
    if (publisherIdIdx === -1) {
      return {
        success: false,
        error: 'Missing required column: "Publisher ID". Please check your CSV file.',
      }
    }
    if (siteAppNameIdx === -1) {
      return {
        success: false,
        error: 'Missing required column: "Site/App Name". Please check your CSV file.',
      }
    }
    if (siteUrlIdx === -1) {
      return {
        success: false,
        error: 'Missing required column: "Site URL". Please check your CSV file.',
      }
    }

    // Parse data rows
    const data: MediaTemplateRow[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])

      // Skip empty rows
      if (values.every(v => !v || !v.trim())) {
        continue
      }

      const pid = values[publisherIdIdx]?.trim() || ''
      const siteAppName = values[siteAppNameIdx]?.trim() || ''
      const siteUrl = values[siteUrlIdx]?.trim() || ''
      const publisherComment = publisherCommentIdx !== -1 ? (values[publisherCommentIdx]?.trim() || '') : ''
      const vendorComment = vendorCommentIdx !== -1 ? (values[vendorCommentIdx]?.trim() || '') : ''

      // Validate required fields
      if (!pid) {
        errors.push(`Row ${i + 1}: Publisher ID is required`)
        continue
      }
      if (!siteAppName) {
        errors.push(`Row ${i + 1}: Site/App Name is required`)
        continue
      }
      if (!siteUrl) {
        errors.push(`Row ${i + 1}: Site URL is required`)
        continue
      }

      data.push({
        pid,
        siteAppName,
        siteUrl,
        publisherComment,
        vendorComment,
      })
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('; '),
      }
    }

    if (data.length === 0) {
      return {
        success: false,
        error: 'No valid data rows found in CSV file',
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current)

  return result
}

/**
 * Parse CSV file from File object
 */
export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  try {
    const text = await file.text()
    return parseMediaTemplateCsv(text)
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
