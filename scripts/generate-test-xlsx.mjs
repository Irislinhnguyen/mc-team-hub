/**
 * Generate test XLSX file for internal ad system upload
 * This creates a file matching the working template structure
 */

import * as XLSX from 'xlsx'

// 36 column headers matching the internal ad system template
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
  'Delivery Method': '',
}

// Sample zones with different MIDs
const sampleZones = [
  {
    'Media Id': '225144',
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

// Set column widths for better readability
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

// Create workbook
const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, worksheet, 'Zones')

// Write file
const filename = 'zones_test_upload.xlsx'
XLSX.writeFile(workbook, filename)

console.log(`Generated test file: ${filename}`)
console.log('File contains 5 sample zones with MIDs 225144 and 225145')
console.log('\nKey columns verified:')
console.log('  Column 5: Point site domain list - present (can be empty)')
console.log('  Column 6: Inventory Type - "Mobile Optimized Web"')
console.log('  Column 7: Type of zone - "スタンダードバナー" or "インタースティシャル"')
