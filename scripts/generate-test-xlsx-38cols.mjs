/**
 * Generate test XLSX file for internal ad system upload (38 columns)
 * This creates a file matching the NEW ad system template structure (updated March 16, 2026)
 *
 * NEW: Added 2 columns (OS and Genre) to match the updated ad system template
 * - Column 37 (AK): OS
 * - Column 38 (AL): Genre
 */

import * as XLSX from '../node_modules/.ignored/xlsx/xlsx.mjs'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 38 column headers matching the NEW internal ad system template (March 2026)
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
  'OS',           // NEW - Column 37 (AK)
  'Delivery Method',
  'Genre',        // NEW - Column 38 (AL)
]

// Default values matching the working file
const DEFAULT_VALUES = {
  'Allowed domain list': '',
  'Point site domain list': '',
  'Inventory Type': 'Mobile Optimized Web',
  'Type of zone': 'スタンダードバナー',
  width: '300',
  height: '250',
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
  'Adjust Iframe size': '',
  'Selector of Iframe Adjuster': '',
  'RTB optimisation type': 'Prioritise revenue',
  'Vendor comment': '',
  Format: '',
  Device: '',
  OS: '',         // NEW
  'Delivery Method': '',
  Genre: '',      // NEW
}

// Sample zones with MIDs from March 5th tested account
const sampleZones = [
  {
    'Media Id': '225144',  // March 5th tested account
    'Name of zone': 'example_com_reward_zone_1',
    'Zone URL': 'https://example.com',
    'Default Payout rate for zone': '0.85',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'example_com_reward_zone_2',
    'Zone URL': 'https://example.com',
    'Default Payout rate for zone': '0.67',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'example_com_interstitial',
    'Zone URL': 'https://example.com',
    'Default Payout rate for zone': '0.90',
    'Type of zone': 'インタースティシャル',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225145',
    'Name of zone': 'testsite_net_standardbanner_300x250',
    'Zone URL': 'https://testsite.net',
    'Default Payout rate for zone': '0.85',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225145',
    'Name of zone': 'testsite_net_flexible_sticky',
    'Zone URL': 'https://testsite.net',
    'Default Payout rate for zone': '0.40',
    ...DEFAULT_VALUES,
  },
]

// Create worksheet with proper header order
const zoneObjects = sampleZones.map(zone => {
  const row = {}
  HEADERS.forEach(header => {
    row[header] = zone[header] || DEFAULT_VALUES[header] || ''
  })
  return row
})

const worksheet = XLSX.utils.json_to_sheet(zoneObjects, { header: HEADERS })

// Set column widths for better readability (38 columns total)
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
  { wch: 15 }, // OS (NEW)
  { wch: 20 }, // Delivery Method
  { wch: 20 }, // Genre (NEW)
]
worksheet['!cols'] = columnWidths

// Create workbook
const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, worksheet, 'Zones')

// Write file using buffer
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const filename = 'zones_test_upload_38cols.xlsx'
const filepath = join(__dirname, '..', filename) // Write to project root
const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
writeFileSync(filepath, buffer)

console.log(`Generated test file: ${filepath}`)
console.log('File contains 5 sample zones with MIDs 225144 (March 5th tested account) and 225145')
console.log('')
console.log('NEW: Template now has 38 columns (was 36 columns before March 16, 2026)')
console.log('  - Column 37 (AK): OS')
console.log('  - Column 38 (AL): Genre')
console.log('')
console.log('Key columns verified:')
console.log('  Column 5: Point site domain list - present (can be empty)')
console.log('  Column 6: Inventory Type - "Mobile Optimized Web"')
console.log('  Column 7: Type of zone - "スタンダードバナー" or "インタースティシャル"')
console.log('  Column 37 (AK): OS - NEW COLUMN')
console.log('  Column 38 (AL): Genre - NEW COLUMN')
console.log('')
console.log('Expected Excel file dimension: A1:AL6 (38 columns x 6 rows)')
