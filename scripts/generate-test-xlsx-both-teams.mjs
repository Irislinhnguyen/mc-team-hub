/**
 * Generate test XLSX files for both App Team and Web Team
 * Standalone test that doesn't require building TypeScript
 */

import * as XLSX from 'xlsx'

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

// Column widths for better readability
const COLUMN_WIDTHS = [
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

function generateWorksheet(zones) {
  const zoneObjects = zones.map(zone => {
    const row = {}
    HEADERS.forEach(header => {
      row[header] = zone[header] || DEFAULT_VALUES[header] || ''
    })
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(zoneObjects, { header: HEADERS })
  worksheet['!cols'] = COLUMN_WIDTHS
  return worksheet
}

function generateXLSX(zones, filename) {
  const worksheet = generateWorksheet(zones)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Zones')
  XLSX.writeFile(workbook, filename)
}

// ==================== APP TEAM (CS) ZONES ====================
console.log('[App Team] Generating XLSX file...')

const appTeamZones = [
  {
    'Media Id': '225144',
    'Name of zone': 'reward_0.40_6752558926_app_pack1',
    'Zone URL': 'https://apps.apple.com/app/id6752558926',
    'App ID': '6752558926',
    'Default Payout rate for zone': '0.40',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'reward_0.12_6752558926_app_pack1',
    'Zone URL': 'https://apps.apple.com/app/id6752558926',
    'App ID': '6752558926',
    'Default Payout rate for zone': '0.12',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'reward_0.67_6752558926_app_pack1',
    'Zone URL': 'https://apps.apple.com/app/id6752558926',
    'App ID': '6752558926',
    'Default Payout rate for zone': '0.67',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'interstitial_0.85_6752558926_app_pack2',
    'Zone URL': 'https://apps.apple.com/app/id6752558926',
    'App ID': '6752558926',
    'Type of zone': 'インタースティシャル',
    'Default Payout rate for zone': '0.85',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'interstitial_0.90_6752558926_app_pack2',
    'Zone URL': 'https://apps.apple.com/app/id6752558926',
    'App ID': '6752558926',
    'Type of zone': 'インタースティシャル',
    'Default Payout rate for zone': '0.90',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225145',
    'Name of zone': 'reward_0.76_1234567890_app',
    'Zone URL': 'https://play.google.com/store/apps/details?id=com.example.app',
    'App ID': 'com.example.app',
    'Default Payout rate for zone': '0.76',
    ...DEFAULT_VALUES,
  },
]

generateXLSX(appTeamZones, 'test_app_team_output.xlsx')
console.log('[App Team] Generated: test_app_team_output.xlsx')
console.log('[App Team] Zones:', appTeamZones.length)

// ==================== WEB TEAM ZONES ====================
console.log('[Web Team] Generating XLSX file...')

const webTeamZones = [
  {
    'Media Id': '225144',
    'Name of zone': 'dantri.com_standardbanner_300x250_header',
    'Zone URL': 'https://dantri.com',
    'Allowed domain list': 'dantri.com',
    'Inventory Type': 'Web',
    'Type of zone': 'スタンダードバナー',
    width: '300',
    height: '250',
    'Default Payout rate for zone': '0.85',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'dantri.com_standardbanner_728x90',
    'Zone URL': 'https://dantri.com',
    'Allowed domain list': 'dantri.com',
    'Inventory Type': 'Web',
    'Type of zone': 'スタンダードバナー',
    width: '728',
    height: '90',
    'Default Payout rate for zone': '0.85',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225144',
    'Name of zone': 'dantri.com_adrecover_sidebar',
    'Zone URL': 'https://dantri.com',
    'Allowed domain list': 'dantri.com',
    'Inventory Type': 'Web',
    'Type of zone': 'スタンダードバナー',
    'Default Payout rate for zone': '0.85',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225145',
    'Name of zone': 'vnexpress.net_flexible_sticky',
    'Zone URL': 'https://vnexpress.net',
    'Allowed domain list': 'vnexpress.net',
    'Inventory Type': 'Web',
    'Type of zone': 'スタンダードバナー',
    'Default Payout rate for zone': '0.40',
    ...DEFAULT_VALUES,
  },
  {
    'Media Id': '225145',
    'Name of zone': 'vnexpress.net_interstitial',
    'Zone URL': 'https://vnexpress.net',
    'Allowed domain list': 'vnexpress.net',
    'Inventory Type': 'Web',
    'Type of zone': 'インタースティシャル',
    'Default Payout rate for zone': '0.90',
    ...DEFAULT_VALUES,
  },
]

generateXLSX(webTeamZones, 'test_web_team_output.xlsx')
console.log('[Web Team] Generated: test_web_team_output.xlsx')
console.log('[Web Team] Zones:', webTeamZones.length)

// ==================== VERIFICATION ====================
console.log('\n==================== VERIFICATION ====================')

function verifyFile(filename, sampleZone) {
  const zoneKeys = Object.keys(sampleZone)
  console.log(`\n[${filename}]`)
  console.log('  Column count:', zoneKeys.length)
  console.log('  ✓ Media Id:', sampleZone['Media Id'])
  console.log('  ✓ Point site domain list:', sampleZone['Point site domain list'] || '(empty)')
  console.log('  ✓ Inventory Type:', sampleZone['Inventory Type'])
  console.log('  ✓ Type of zone:', sampleZone['Type of zone'])
  console.log('  ✓ Use RTB:', sampleZone['Use RTB'])
  console.log('  ✓ Allow External Delivery:', sampleZone['Allow External Delivery'])
  console.log('  ✓ Category:', sampleZone['Category'])
  console.log('  ✓ Default Payout rate for zone:', sampleZone['Default Payout rate for zone'])
}

verifyFile('App Team', appTeamZones[0])
verifyFile('Web Team', webTeamZones[0])

console.log('\n==================== READY FOR UPLOAD ====================')
console.log('Files generated:')
console.log('  1. test_app_team_output.xlsx - For App Team (CS) testing')
console.log('  2. test_web_team_output.xlsx - For Web Team testing')
console.log('\nYou can upload these files to the internal ad system to verify the format.')
