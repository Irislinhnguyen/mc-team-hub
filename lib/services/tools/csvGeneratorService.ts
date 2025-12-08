/**
 * AI-powered CSV Zone Generator Service
 * Uses OpenAI GPT-4o to generate zone configurations from natural language prompts
 */

import OpenAI from 'openai'
import * as XLSX from 'xlsx'
import type { GeneratedZone } from '@/lib/types/tools'

// Initialize OpenAI client lazily (server-side only)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// CSV Schema template with all 34 columns
const CSV_SCHEMA = {
  'Name of zone': 'string (e.g., "reward_game_001_app")',
  'Zone URL': 'string (app URL or website URL)',
  'Allowed domain list': 'string? (optional)',
  'Inventory Type': 'Mobile Optimized Web | Desktop | App',
  'Type of zone': 'スタンダードバナー | インタースティシャル | native (Japanese)',
  width: 'number (300, 728, 970, 320, etc.)',
  height: 'number (250, 90, 250, 50, etc.)',
  'Use multiple sizes': 'string?',
  'Multi sizes': 'string?',
  'Enable Bidder Delivery': 'string?',
  'Create Reports from Bid Price': 'string?',
  'Method of Bidprice': 'string?',
  'CPM(iOS)(USD)': 'number?',
  'CPM(Android)(USD)': 'number?',
  'CPM(Other)(USD)': 'number?',
  'Floor Price(USD)': 'number?',
  'Deduct margin from RTB value at bidder delivery': 'string?',
  'Zone position': 'Above the article | Under the article/column | etc.',
  'Allow Semi Adult Contents': 'string?',
  'Allow semi-adult categories': 'string?',
  'Use RTB': 'YES | NO',
  'Allow External Delivery': 'YES | NO',
  'App ID': 'string?',
  'Allow VtoV': 'string?',
  Category: 'アート＆エンターテイメント | ニュース | ゲーム | etc. (Japanese)',
  'Category Detail': 'ユーモア | etc. (Japanese)',
  'Default Payout rate for zone': 'number (0-1, e.g., 0.85)',
  'Adjust Iframe size': 'string?',
  'Selector of Iframe Adjuster': 'string?',
  'RTB optimisation type': 'Prioritise revenue | etc.',
  'Vendor comment': 'string?',
  Format: 'string?',
  Device: 'string?',
  'Delivery Method': 'string?',
}

function buildSystemPrompt(zoneUrl: string, appId: string): string {
  return `You are an expert ad zone CSV generator. Generate zone configurations based on user requirements.

IMPORTANT RULES:
1. Zone URL is ALWAYS: "${zoneUrl}"
2. App ID extracted from URL: "${appId}"
3. Zone naming format: {product}_{floor_price}_{app_id}_app
   - product: "reward", "interstitial", "native", "banner", etc.
   - floor_price: floor price value as decimal string (e.g., "0.76" for FR 0.76, "0.5" for FR 0.5)
   - app_id: ${appId}
   - Example: "reward_0.76_${appId}_app"

4. Parse user prompt to extract:
   - Product type (reward, interstitial, native, banner)
   - Floor price (FR) - USE THE EXACT VALUE, DO NOT MULTIPLY BY 100
   - Quantity of zones

   Example prompt: "3 zone reward FR 0.76, 3 zone interstitial FR 0.85"
   Should generate:
   - reward_0.76_${appId}_app
   - reward_0.76_${appId}_app (duplicate name is OK)
   - reward_0.76_${appId}_app
   - interstitial_0.85_${appId}_app
   - interstitial_0.85_${appId}_app
   - interstitial_0.85_${appId}_app

5. Default values for ALL zones (copy from sample):
   - Inventory Type: "Mobile Optimized Web"
   - Type of zone: "スタンダードバナー"
   - width: 300
   - height: 250
   - Use RTB: "YES"
   - Allow External Delivery: "YES"
   - Category: "アート＆エンターテイメント"
   - Category Detail: "ユーモア"
   - Default Payout rate: 0.85
   - Zone position: "Under the article/column"
   - RTB optimisation type: "Prioritise revenue"
   - Floor Price(USD): use the FR value from user prompt

6. Return JSON with "zones" array containing all zone objects.

CSV Schema (34 columns):
${JSON.stringify(CSV_SCHEMA, null, 2)}`
}

/**
 * Extract App ID from Zone URL
 * Formula: =IFERROR(IF(ISNUMBER(SEARCH("apple",URL)),MID(URL,SEARCH("/id",URL)+3,20),MID(URL,SEARCH("?id=",URL)+4,100)),"")
 */
function extractAppIdFromUrl(url: string): string {
  try {
    if (!url) return ''

    // Check if Apple App Store URL
    if (url.toLowerCase().includes('apple')) {
      const idIndex = url.indexOf('/id')
      if (idIndex !== -1) {
        return url.substring(idIndex + 3, idIndex + 23).replace(/[^0-9]/g, '')
      }
    }

    // Check for Android/other URLs with ?id= parameter
    const idParamIndex = url.indexOf('?id=')
    if (idParamIndex !== -1) {
      const appId = url.substring(idParamIndex + 4, idParamIndex + 104)
      // Return until next & or end of string
      const endIndex = appId.indexOf('&')
      return endIndex !== -1 ? appId.substring(0, endIndex) : appId
    }

    return ''
  } catch (error) {
    console.error('Error extracting App ID:', error)
    return ''
  }
}

/**
 * Generate zone CSV from natural language prompt
 * @param zoneUrl App URL to extract App ID from
 * @param userPrompt User's description of zones to create (e.g., "3 zone reward FR 0.76, 3 zone interstitial FR 0.85")
 * @returns Buffer containing Excel file data
 */
export async function generateZoneCSV(
  zoneUrl: string,
  userPrompt: string
): Promise<{
  buffer: Buffer
  zones: GeneratedZone[]
}> {
  try {
    console.log('[CSV Generator] Zone URL:', zoneUrl)
    console.log('[CSV Generator] Prompt:', userPrompt)

    // Extract App ID from URL
    const appId = extractAppIdFromUrl(zoneUrl)
    if (!appId) {
      throw new Error('Could not extract App ID from URL. Please check the URL format.')
    }
    console.log('[CSV Generator] Extracted App ID:', appId)

    const systemPrompt = buildSystemPrompt(zoneUrl, appId)

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    const zones: GeneratedZone[] = result.zones || []

    if (zones.length === 0) {
      throw new Error('No zones generated. Please refine your prompt.')
    }

    console.log(`[CSV Generator] Generated ${zones.length} zones`)

    // Convert JSON to Excel buffer
    const worksheet = XLSX.utils.json_to_sheet(zones)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Zones')

    // Set column widths for better readability
    const columnWidths = [
      { wch: 35 }, // Name of zone
      { wch: 50 }, // Zone URL
      { wch: 20 }, // Allowed domain list
      { wch: 25 }, // Inventory Type
      { wch: 20 }, // Type of zone
      { wch: 10 }, // width
      { wch: 10 }, // height
    ]
    worksheet['!cols'] = columnWidths

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return { buffer, zones }
  } catch (error: any) {
    console.error('[CSV Generator] Error:', error)
    throw new Error(`Failed to generate CSV: ${error.message}`)
  }
}

