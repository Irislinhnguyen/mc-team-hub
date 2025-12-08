/**
 * AI Vision-powered Zone Extraction Service
 * Uses OpenAI Vision API to extract zone data from screenshots
 */

import OpenAI from 'openai'
import type { ExtractedZone } from '@/lib/types/tools'

// Initialize OpenAI client lazily (server-side only)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

const EXTRACTION_PROMPT = `Extract all zone data from this screenshot table.

The table shows advertising zone information with the following columns:
- Zone Id
- Name of zone
- Size
- Inventory Type
- Type of zone
- Category
- Approval status
- Total(Paid+3PAS)
- Imp (Impressions)
- CTR
- Revenue
- eCPM/CPC
- Ad Source
- Archive

Return JSON with this exact structure:
{
  "zones": [
    {
      "zone_id": "1598735",
      "zone_name": "banner_0.46_com.chgames.nds64emulator_app",
      "size": "300x250",
      "inventory_type": "Mobile optimized web",
      "type": "Standard banner",
      "category": "Arts & Entertainment",
      "approval_status": "Approved",
      "impressions": 0,
      "ctr": 0.00,
      "revenue": 0.00,
      "ecpm": 0.0000,
      "ad_source": "(23)"
    }
  ]
}

Important:
1. Extract ALL rows from the table
2. Convert text to proper format (numbers, decimals, etc.)
3. Use null for missing/empty values
4. Preserve exact zone IDs and names AS-IS - do NOT modify zone names
5. Zone names contain decimal numbers (e.g., "0.46", "0.27") - keep the DOT/PERIOD character, do NOT replace with underscore
6. Handle comma-separated numbers correctly (remove commas)
7. Return only the JSON, no additional text`

/**
 * Extract zone IDs and metadata from screenshot using AI Vision
 * @param imageFile Screenshot image file (PNG, JPG, JPEG)
 * @returns Array of extracted zone data
 */
export async function extractZoneIdsFromScreenshot(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedZone[]> {
  try {
    console.log('[Zone Extraction] Processing screenshot...')

    // Convert buffer to base64
    const base64 = imageBuffer.toString('base64')

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high', // Use high detail for better table extraction
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0, // Use deterministic extraction
      max_tokens: 4096,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    const zones: ExtractedZone[] = result.zones || []

    if (zones.length === 0) {
      throw new Error('No zones found in the screenshot. Please ensure the screenshot shows the zone table clearly.')
    }

    console.log(`[Zone Extraction] Extracted ${zones.length} zones`)

    // Clean and normalize data
    const cleanedZones = zones.map((zone) => ({
      zone_id: String(zone.zone_id || '').trim(),
      zone_name: String(zone.zone_name || '').trim(),
      size: String(zone.size || '').trim(),
      inventory_type: zone.inventory_type ? String(zone.inventory_type).trim() : null,
      type: zone.type ? String(zone.type).trim() : null,
      category: zone.category ? String(zone.category).trim() : null,
      approval_status: zone.approval_status ? String(zone.approval_status).trim() : null,
      impressions: zone.impressions !== null && zone.impressions !== undefined ? Number(zone.impressions) : null,
      ctr: zone.ctr !== null && zone.ctr !== undefined ? Number(zone.ctr) : null,
      revenue: zone.revenue !== null && zone.revenue !== undefined ? Number(zone.revenue) : null,
      ecpm: zone.ecpm !== null && zone.ecpm !== undefined ? Number(zone.ecpm) : null,
      ad_source: zone.ad_source ? String(zone.ad_source).trim() : null,
    }))

    return cleanedZones
  } catch (error: any) {
    console.error('[Zone Extraction] Error:', error)

    if (error.message?.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.')
    }

    if (error.message?.includes('image')) {
      throw new Error('Could not process image. Please ensure it\'s a valid PNG or JPG file.')
    }

    throw new Error(`Failed to extract zones: ${error.message}`)
  }
}

/**
 * Validate extracted zone data
 */
export function validateExtractedZones(zones: ExtractedZone[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (zones.length === 0) {
    errors.push('No zones extracted')
    return { valid: false, errors }
  }

  zones.forEach((zone, index) => {
    if (!zone.zone_id || zone.zone_id.trim() === '') {
      errors.push(`Zone ${index + 1}: Missing zone ID`)
    }

    if (!zone.zone_name || zone.zone_name.trim() === '') {
      errors.push(`Zone ${index + 1}: Missing zone name`)
    }

    if (!zone.size || zone.size.trim() === '') {
      errors.push(`Zone ${index + 1}: Missing size`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
