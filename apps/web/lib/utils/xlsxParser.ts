/**
 * XLSX Parser Utility for Tag Creation Tool
 * Parses media_template XLSX files for Step 0
 */

import * as XLSX from 'xlsx'
import type { MediaTemplateRow } from '@query-stream-ai/types/tools'

export interface XlsxParseResult {
  success: boolean
  data?: MediaTemplateRow[]
  error?: string
}

/**
 * Parse XLSX file for media template
 * Expected columns (case-insensitive):
 * - Publisher ID (required)
 * - Site/App Name (required)
 * - Site URL (required)
 * - Publisher Comment (optional)
 * - Vendor Comment (optional)
 */
export async function parseXlsxFile(file: File): Promise<XlsxParseResult> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return {
        success: false,
        error: 'XLSX file contains no sheets',
      }
    }

    const worksheet = workbook.Sheets[firstSheetName]

    // Convert to array of arrays (raw values)
    const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: '',
    })

    if (!rawData || rawData.length < 2) {
      return {
        success: false,
        error: 'XLSX file must contain at least a header row and one data row',
      }
    }

    // Parse header
    const header = rawData[0].map(h => String(h || '').toLowerCase().trim())

    // Find column indices
    const publisherIdIdx = header.findIndex(h =>
      h === 'publisher id' || h === 'publisherid' || h === 'pid'
    )
    const siteAppNameIdx = header.findIndex(h =>
      h === 'site/app name' || h === 'site/appname' || h === 'siteapp name' ||
      h === 'site app name' || h === 'siteappname' || h === 'app name' ||
      h === 'appname' || h === 'site/app_name' || h === 'site/app-name'
    )
    const siteUrlIdx = header.findIndex(h =>
      h === 'site url' || h === 'siteurl' || h === 'site url' ||
      h === 'url' || h === 'site/url' || h === 'site-url'
    )
    const publisherCommentIdx = header.findIndex(h =>
      h === 'publisher comment' || h === 'publishercomment' || h === 'publisher comment'
    )
    const vendorCommentIdx = header.findIndex(h =>
      h === 'vendor comment' || h === 'vendorcomment' || h === 'vendor comment'
    )

    // Validate required columns
    if (publisherIdIdx === -1) {
      return {
        success: false,
        error: 'Missing required column: "Publisher ID". Please check your XLSX file.',
      }
    }
    if (siteAppNameIdx === -1) {
      return {
        success: false,
        error: 'Missing required column: "Site/App Name". Please check your XLSX file.',
      }
    }
    if (siteUrlIdx === -1) {
      return {
        success: false,
        error: 'Missing required column: "Site URL". Please check your XLSX file.',
      }
    }

    // Parse data rows
    const data: MediaTemplateRow[] = []
    const errors: string[] = []

    for (let i = 1; i < rawData.length; i++) {
      const values = rawData[i] || []

      // Skip empty rows
      if (values.every(v => !v || !String(v).trim())) {
        continue
      }

      const pid = String(values[publisherIdIdx] || '').trim()
      const siteAppName = String(values[siteAppNameIdx] || '').trim()
      const siteUrl = String(values[siteUrlIdx] || '').trim()
      const publisherComment = publisherCommentIdx !== -1 ? String(values[publisherCommentIdx] || '').trim() : ''
      const vendorComment = vendorCommentIdx !== -1 ? String(values[vendorCommentIdx] || '').trim() : ''

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
        error: 'No valid data rows found in XLSX file',
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
