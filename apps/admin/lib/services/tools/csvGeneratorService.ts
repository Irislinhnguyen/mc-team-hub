/**
 * AI-powered XLSX Zone Generator Service for App Team (CS)
 * Uses OpenAI GPT-4o to generate zone configurations from natural language prompts
 * Generates XLSX files with all 36 columns matching the internal ad system template
 */

import OpenAI from 'openai'
import * as XLSX from 'xlsx'
import type { GeneratedZone } from '@/lib/types/tools'

// All 36 column headers matching the internal ad system template
const HEADERS = [
  'Media Id',
  'Name of zone',
  'Zone URL',
  'Allowed domain list',
  'Point site domain list',
  'Inventory Type',
  'Type of zone',
  'width',
  'height',
  'Use multiple sizes',
  'Multi sizes',
  'Enable Bidder Delivery',
  'Create Reports from Bid Price',
  'Method of Bidprice',
  'CPM(iOS)(JPY)',
  'CPM(Android)(JPY)',
  'CPM(Other)(JPY)',
  'Floor Price(JPY)',
  'Deduct margin from RTB value at bidder delivery',
  'Zone position',
  'Allow Semi Adult Contents',
  'Allow semi-adult categories',
  'Use RTB',
  'Allow External Delivery',
  'App ID',
  'Allow VtoV',
  'Category',
  'Category Detail',
  'Default Payout rate for zone',
  'Adjust Iframe size',
  'Selector of Iframe Adjuster',
  'RTB optimisation type',
  'Vendor comment',
  'Format',
  'Device',
  'Delivery Method',
] as const

// Initialize OpenAI client lazily (server-side only)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

/**
 * Create zone template with all 36 columns and default values
 * AI will only fill in: Name of zone, width, height
 * Other 33 columns use default values
 */
function createZoneTemplate(zoneUrl: string, payoutRate: number): Record<string, any> {
  return {
    'Media Id': '', // Filled later from Step 0 data
    'Name of zone': '', // AI fills this
    'Zone URL': zoneUrl,
    'Allowed domain list': '',
    'Point site domain list': '',
    'Inventory Type': 'Mobile Optimized Web',
    'Type of zone': 'スタンダードバナー',
    width: 300, // AI can override
    height: 250, // AI can override
    'Use multiple sizes': '',
    'Multi sizes': '',
    'Enable Bidder Delivery': '',
    'Create Reports from Bid Price': '',
    'Method of Bidprice': '',
    'CPM(iOS)(JPY)': '',
    'CPM(Android)(JPY)': '',
    'CPM(Other)(JPY)': '',
    'Floor Price(JPY)': '',
    'Deduct margin from RTB value at bidder delivery': '',
    'Zone position': 'Under the article/column',
    'Allow Semi Adult Contents': '',
    'Allow semi-adult categories': '',
    'Use RTB': 'YES',
    'Allow External Delivery': 'YES',
    'App ID': '',
    'Allow VtoV': '',
    Category: 'アート＆エンターテイメント',
    'Category Detail': 'ユーモア',
    'Default Payout rate for zone': payoutRate,
    'Adjust Iframe size': '',
    'Selector of Iframe Adjuster': '',
    'RTB optimisation type': 'Prioritise revenue',
    'Vendor comment': '',
    Format: '',
    Device: '',
    'Delivery Method': '',
  }
}

function buildSystemPrompt(zoneUrl: string, appId: string, payoutRate: number): string {
  return `You are an expert ad zone name generator. Generate ONLY zone names based on user requirements.

IMPORTANT RULES:
1. Zone naming format: {product}_{floor_price}_{app_id}_app
   - product: "reward", "interstitial", "native", "banner", etc.
   - floor_price: floor price value as decimal string (e.g., "0.76" for FR 0.76, "0.5" for FR 0.5)
   - app_id: ${appId}
   - Example: "reward_0.76_${appId}_app"

2. Parse user prompt to extract:
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

3. Return ONLY a simple JSON array with zone names and optional width/height:
   {
     "zones": [
       { "name": "reward_0.76_${appId}_app", "width": 300, "height": 250 },
       { "name": "interstitial_0.85_${appId}_app", "width": 300, "height": 250 }
     ]
   }

4. DO NOT include other fields - they will be filled from template automatically.`
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
 * Generate zone XLSX from natural language prompt
 * @param zoneUrl App URL to extract App ID from
 * @param userPrompt User's description of zones to create (e.g., "3 zone reward FR 0.76, 3 zone interstitial FR 0.85")
 * @param payoutRate Payout rate for all zones (0-1, e.g., 0.85)
 * @param mediaId Media ID from Step 0 (optional, will be filled in template)
 * @returns Buffer containing Excel file data
 */
export async function generateZoneCSV(
  zoneUrl: string,
  userPrompt: string,
  payoutRate: number,
  mediaId: string = ''
): Promise<{
  buffer: Buffer
  zones: GeneratedZone[]
}> {
  try {
    console.log('[CSV Generator] Zone URL:', zoneUrl)
    console.log('[CSV Generator] Prompt:', userPrompt)
    console.log('[CSV Generator] Payout Rate:', payoutRate)

    // Extract App ID from URL
    const appId = extractAppIdFromUrl(zoneUrl)
    if (!appId) {
      throw new Error('Could not extract App ID from URL. Please check the URL format.')
    }
    console.log('[CSV Generator] Extracted App ID:', appId)

    const systemPrompt = buildSystemPrompt(zoneUrl, appId, payoutRate)

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
    const aiZones: Array<{ name: string; width?: number; height?: number }> = result.zones || []

    if (aiZones.length === 0) {
      throw new Error('No zones generated. Please refine your prompt.')
    }

    console.log(`[CSV Generator] AI generated ${aiZones.length} zone names`)

    // Merge AI output into template (ensures all 36 columns exist)
    const zones: GeneratedZone[] = aiZones.map((aiZone) => {
      const template = createZoneTemplate(zoneUrl, payoutRate)
      template['Media Id'] = mediaId // Set Media ID
      return {
        ...template,
        'Name of zone': aiZone.name,
        width: aiZone.width || template.width,
        height: aiZone.height || template.height,
      }
    })

    console.log(`[CSV Generator] Created ${zones.length} complete zones with 36 columns`)

    // Convert JSON to Excel buffer with proper header order
    const worksheet = XLSX.utils.json_to_sheet(zones, { header: HEADERS })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Zones')

    // Set column widths for better readability (36 columns total)
    const columnWidths = [
      { wch: 15 }, // Media Id
      { wch: 35 }, // Name of zone
      { wch: 50 }, // Zone URL
      { wch: 20 }, // Allowed domain list
      { wch: 25 }, // Point site domain list
      { wch: 25 }, // Inventory Type
      { wch: 20 }, // Type of zone
      { wch: 10 }, // width
      { wch: 10 }, // height
      { wch: 20 }, // Use multiple sizes
      { wch: 20 }, // Multi sizes
      { wch: 20 }, // Enable Bidder Delivery
      { wch: 25 }, // Create Reports from Bid Price
      { wch: 20 }, // Method of Bidprice
      { wch: 15 }, // CPM(iOS)(JPY)
      { wch: 15 }, // CPM(Android)(JPY)
      { wch: 15 }, // CPM(Other)(JPY)
      { wch: 15 }, // Floor Price(JPY)
      { wch: 30 }, // Deduct margin from RTB value at bidder delivery
      { wch: 25 }, // Zone position
      { wch: 25 }, // Allow Semi Adult Contents
      { wch: 25 }, // Allow semi-adult categories
      { wch: 15 }, // Use RTB
      { wch: 20 }, // Allow External Delivery
      { wch: 30 }, // App ID
      { wch: 15 }, // Allow VtoV
      { wch: 30 }, // Category
      { wch: 20 }, // Category Detail
      { wch: 25 }, // Default Payout rate for zone
      { wch: 20 }, // Adjust Iframe size
      { wch: 25 }, // Selector of Iframe Adjuster
      { wch: 25 }, // RTB optimisation type
      { wch: 20 }, // Vendor comment
      { wch: 15 }, // Format
      { wch: 15 }, // Device
      { wch: 20 }, // Delivery Method
    ]
    worksheet['!cols'] = columnWidths

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return { buffer, zones }
  } catch (error: any) {
    console.error('[CSV Generator] Error:', error)
    throw new Error(`Failed to generate CSV: ${error.message}`)
  }
}

