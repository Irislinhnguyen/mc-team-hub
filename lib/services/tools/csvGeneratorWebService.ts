/**
 * CSV Zone Generator Service for Team Web
 * Generates zone CSV files for web placements
 */

import OpenAI from 'openai'
import * as XLSX from 'xlsx'

// Initialize OpenAI client lazily (server-side only)
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

interface WebZoneInput {
  mediaName: string
  products: Array<{
    product: string
    quantity: number
    sizes?: Array<{ size: string; quantity: number }>
    notes?: string
  }>
  aiPrompt?: string
}

interface WebZoneOutput {
  'Name of zone': string
  'Zone URL': string
  'Allowed domain list'?: string
  'Inventory Type': string
  'Type of zone': string
  width: number | string
  height: number | string
  'Use multiple sizes'?: string
  'Multi sizes'?: string
  'Enable Bidder Delivery'?: string
  'Create Reports from Bid Price'?: string
  'Method of Bidprice'?: string
  'CPM(iOS)(USD)'?: number
  'CPM(Android)(USD)'?: number
  'CPM(Other)(USD)'?: number
  'Floor Price(USD)'?: number
  'Deduct margin from RTB value at bidder delivery'?: string
  'Zone position'?: string
  'Allow Semi Adult Contents'?: string
  'Allow semi-adult categories'?: string
  'Use RTB': string
  'Allow External Delivery': string
  'App ID'?: string
  'Allow VtoV'?: string
  Category?: string
  'Category Detail'?: string
  'Default Payout rate for zone': number
  'Adjust Iframe size'?: string
  'Selector of Iframe Adjuster'?: string
  'RTB optimisation type': string
  'Vendor comment'?: string
  Format?: string
  Device?: string
  'Delivery Method'?: string
}

/**
 * Generate zones with formula (no AI)
 */
function generateZonesWithFormula(input: WebZoneInput, payoutRate: number): WebZoneOutput[] {
  const zones: WebZoneOutput[] = []
  const mediaNameSanitized = input.mediaName.trim().toLowerCase().replace(/\s+/g, '_')

  input.products.forEach(({ product, quantity, sizes, notes }) => {
    const isBannerProduct = product.toLowerCase().includes('banner')
    // Preserve original product name but replace spaces with underscores and lowercase
    const productLower = product.toLowerCase().replace(/\s+/g, '_')
    const notesSuffix = notes?.trim() ? `_${notes.trim().replace(/\s+/g, '_')}` : ''

    if (isBannerProduct) {
      // For Banner products
      // First, generate zones with sizes if sizes exist
      if (sizes && sizes.length > 0) {
        // With sizes: each size has its own quantity
        // Format: {medianame}_{product}_{size}_{number}_{notes}
        sizes.forEach(({ size, quantity: sizeQty }) => {
          const [width, height] = size.split('x').map(s => parseInt(s, 10))

          for (let i = 1; i <= sizeQty; i++) {
            // Only add number suffix if quantity > 1
            const numberSuffix = sizeQty > 1 ? `_${i}` : ''
            const zoneName = `${mediaNameSanitized}_${productLower}_${size}${numberSuffix}${notesSuffix}`
            zones.push({
            'Name of zone': zoneName,
            'Zone URL': input.mediaName,
            'Allowed domain list': '',
            'Inventory Type': 'Desktop',
            'Type of zone': 'スタンダードバナー',
            width: width || 300,
            height: height || 250,
            'Use multiple sizes': '',
            'Multi sizes': '',
            'Enable Bidder Delivery': '',
            'Create Reports from Bid Price': '',
            'Method of Bidprice': '',
            'CPM(iOS)(USD)': undefined,
            'CPM(Android)(USD)': undefined,
            'CPM(Other)(USD)': undefined,
            'Floor Price(USD)': undefined,
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
          })
        }
      })
      }

      // Then, generate zones without sizes if quantity > 0
      // This allows creating both sized and unsized zones
      if (quantity > 0) {
        // Banner without size suffix: use product-level quantity
        // Format: {medianame}_{product}_{number}_{notes}
        for (let i = 1; i <= quantity; i++) {
          const numberSuffix = quantity > 1 ? `_${i}` : ''
          const zoneName = `${mediaNameSanitized}_${productLower}${numberSuffix}${notesSuffix}`
          zones.push({
            'Name of zone': zoneName,
            'Zone URL': input.mediaName,
            'Allowed domain list': '',
            'Inventory Type': 'Desktop',
            'Type of zone': 'スタンダードバナー',
            width: 300,
            height: 250,
            'Use multiple sizes': '',
            'Multi sizes': '',
            'Enable Bidder Delivery': '',
            'Create Reports from Bid Price': '',
            'Method of Bidprice': '',
            'CPM(iOS)(USD)': undefined,
            'CPM(Android)(USD)': undefined,
            'CPM(Other)(USD)': undefined,
            'Floor Price(USD)': undefined,
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
          })
        }
      }
    } else if (quantity > 0) {
      // For non-Banner products: use product-level quantity
      // Format: {medianame}_{product}_{number}_{notes}
      for (let i = 1; i <= quantity; i++) {
        // Only add number suffix if quantity > 1
        const numberSuffix = quantity > 1 ? `_${i}` : ''
        const zoneName = `${mediaNameSanitized}_${productLower}${numberSuffix}${notesSuffix}`
        zones.push({
          'Name of zone': zoneName,
          'Zone URL': input.mediaName,
          'Allowed domain list': '',
          'Inventory Type': 'Desktop',
          'Type of zone': product.toLowerCase().includes('interstitial') ? 'インタースティシャル' : 'スタンダードバナー',
          width: 300,
          height: 250,
          'Use multiple sizes': '',
          'Multi sizes': '',
          'Enable Bidder Delivery': '',
          'Create Reports from Bid Price': '',
          'Method of Bidprice': '',
          'CPM(iOS)(USD)': undefined,
          'CPM(Android)(USD)': undefined,
          'CPM(Other)(USD)': undefined,
          'Floor Price(USD)': undefined,
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
        })
      }
    }
  })

  return zones
}

/**
 * Create zone template with all 34 columns and default values (Team Web)
 */
function createWebZoneTemplate(mediaName: string, payoutRate: number): WebZoneOutput {
  return {
    'Name of zone': '', // AI fills this
    'Zone URL': mediaName,
    'Allowed domain list': '',
    'Inventory Type': 'Desktop',
    'Type of zone': 'スタンダードバナー',
    width: 300, // AI can override
    height: 250, // AI can override
    'Use multiple sizes': '',
    'Multi sizes': '',
    'Enable Bidder Delivery': '',
    'Create Reports from Bid Price': '',
    'Method of Bidprice': '',
    'CPM(iOS)(USD)': undefined,
    'CPM(Android)(USD)': undefined,
    'CPM(Other)(USD)': undefined,
    'Floor Price(USD)': undefined,
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

/**
 * Generate zones with AI (when prompt provided)
 */
async function generateZonesWithAI(
  input: WebZoneInput,
  payoutRate: number
): Promise<WebZoneOutput[]> {
  const openai = getOpenAIClient()

  // Build context about products
  const productsContext = input.products
    .map((p) => {
      const isBanner = p.product.toLowerCase().includes('banner')
      if (isBanner) {
        if (p.sizes && p.sizes.length > 0) {
          const sizesStr = p.sizes.map((s) => `${s.size} (qty: ${s.quantity})`).join(', ')
          return `- ${p.product}: sizes [${sizesStr}]${p.notes ? `, notes: "${p.notes}"` : ''}`
        } else {
          return `- ${p.product}: quantity ${p.quantity} (no specific sizes)${p.notes ? `, notes: "${p.notes}"` : ''}`
        }
      } else {
        return `- ${p.product}: quantity ${p.quantity}${p.notes ? `, notes: "${p.notes}"` : ''}`
      }
    })
    .join('\n')

  const prompt = `You are a zone naming expert for web advertising.

Media Name: ${input.mediaName}
Products requested:
${productsContext}

User's special instructions:
${input.aiPrompt}

Standard naming format:
- For Banner products with sizes: {medianame}_{product}_{size}_{number}_{suffix}
- For Banner products without sizes: {medianame}_{product}_{number}_{suffix}
- For Banner products with BOTH quantity and sizes: Generate BOTH types
- For other products: {medianame}_{product}_{number}_{suffix}

CRITICAL RULES:
1. Product name: Use EXACT product name (preserve case) but replace spaces with underscores
   - "StandardBanner" → "standardbanner"
   - "AdRecover" → "adrecover"
   - "Flexible sticky" → "flexible_sticky"

2. Number suffix:
   - If quantity is 1: DO NOT add number suffix (no "_1")
   - If quantity is 2+: Add "_1", "_2", "_3", etc.

3. Special suffixes (like "_gamtag", "_header"):
   - ONLY add to zones explicitly mentioned in user's instructions
   - DO NOT add to other zones
   - DO NOT add trailing "_" to zones without special suffix

Examples:
- Correct: dantri.com_standardbanner_300x250_gamtag (qty=1, special suffix)
- Correct: dantri.com_adrecover_1 (qty=2, no trailing _)
- Correct: dantri.com_interstitial (qty=1, no number, no trailing _)
- Wrong: dantri.com_banner_300x250_1_ (has trailing _)
- Wrong: dantri.com_adrecover_1_ (has trailing _)

Return ONLY a simple JSON array with zone names and optional width/height:
{
  "zones": [
    { "name": "dantri.com_standardbanner_300x250", "width": 300, "height": 250 },
    { "name": "dantri.com_interstitial", "width": 300, "height": 250 }
  ]
}

DO NOT include other fields - they will be filled from template automatically.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a zone naming expert. Always return valid JSON objects.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from AI')
  }

  const parsed = JSON.parse(content)
  const aiZones: Array<{ name: string; width?: number; height?: number }> = parsed.zones || []

  if (!Array.isArray(aiZones) || aiZones.length === 0) {
    throw new Error('No valid zones generated by AI')
  }

  console.log(`[CSV Generator Web AI] Generated ${aiZones.length} zone names`)

  // Merge AI output into template (ensures all 34 columns exist)
  const zones: WebZoneOutput[] = aiZones.map((aiZone) => {
    const template = createWebZoneTemplate(input.mediaName, payoutRate)
    return {
      ...template,
      'Name of zone': aiZone.name,
      width: aiZone.width || template.width,
      height: aiZone.height || template.height,
    }
  })

  console.log(`[CSV Generator Web AI] Created ${zones.length} complete zones with 34 columns`)

  return zones
}

/**
 * Generate zone CSV for Team Web
 * @param input Zone configuration input
 * @param payoutRate Payout rate for all zones (0-1, e.g., 0.85)
 * @returns Buffer containing Excel file data and zone count
 */
export async function generateWebZoneCSV(
  input: WebZoneInput,
  payoutRate: number
): Promise<{
  buffer: Buffer
  zoneCount: number
}> {
  try {
    console.log('[CSV Generator Web] Media Name:', input.mediaName)
    console.log('[CSV Generator Web] Products:', input.products.length)
    console.log('[CSV Generator Web] Has AI Prompt:', !!input.aiPrompt)

    let zones: WebZoneOutput[]

    if (input.aiPrompt?.trim()) {
      // Use AI generation
      console.log('[CSV Generator Web] Using AI generation')
      zones = await generateZonesWithAI(input, payoutRate)
    } else {
      // Use formula generation
      console.log('[CSV Generator Web] Using formula generation')
      zones = generateZonesWithFormula(input, payoutRate)
    }

    if (zones.length === 0) {
      throw new Error('No zones generated')
    }

    console.log(`[CSV Generator Web] Generated ${zones.length} zones`)

    // Convert JSON to Excel buffer
    const worksheet = XLSX.utils.json_to_sheet(zones)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Zones')

    // Set column widths for better readability (34 columns total)
    const columnWidths = [
      { wch: 35 }, // Name of zone
      { wch: 50 }, // Zone URL
      { wch: 20 }, // Allowed domain list
      { wch: 25 }, // Inventory Type
      { wch: 20 }, // Type of zone
      { wch: 10 }, // width
      { wch: 10 }, // height
      { wch: 20 }, // Use multiple sizes
      { wch: 20 }, // Multi sizes
      { wch: 20 }, // Enable Bidder Delivery
      { wch: 25 }, // Create Reports from Bid Price
      { wch: 20 }, // Method of Bidprice
      { wch: 15 }, // CPM(iOS)(USD)
      { wch: 15 }, // CPM(Android)(USD)
      { wch: 15 }, // CPM(Other)(USD)
      { wch: 15 }, // Floor Price(USD)
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

    return { buffer, zoneCount: zones.length }
  } catch (error: any) {
    console.error('[CSV Generator Web] Error:', error)
    throw new Error(`Failed to generate CSV: ${error.message}`)
  }
}
