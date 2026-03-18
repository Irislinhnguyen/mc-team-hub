/**
 * Test App Team (CS) XLSX Generator with NEW 38-column format
 * Uses the actual csvGeneratorService to generate a test file
 *
 * This test uses the March 5th tested account (MID 225144)
 * and verifies the new 38-column format (added OS and Genre columns)
 */

import { generateZoneCSV } from '../lib/services/tools/csvGeneratorService.ts'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test parameters for App Team (using March 5th tested account)
const zoneUrl = 'https://apps.apple.com/app/id6752558926'
const userPrompt = 'Create 3 reward zones with FP: 0.4, 0.12, 0.67 respectively - add "_pack 1" at the end of each zone name, and 2 interstitial zones with FP: 0.85, 0.90 - add "_pack 2" at the end'
const payoutRate = 0.85
const mediaId = '225144'  // March 5th tested account

console.log('[Test App Team - 38 Cols] Starting XLSX generation...')
console.log('[Test App Team - 38 Cols] Zone URL:', zoneUrl)
console.log('[Test App Team - 38 Cols] Prompt:', userPrompt)
console.log('[Test App Team - 38 Cols] Payout Rate:', payoutRate)
console.log('[Test App Team - 38 Cols] Media ID:', mediaId, '(March 5th tested account)')
console.log('')

try {
  const { buffer, zones } = await generateZoneCSV(zoneUrl, userPrompt, payoutRate, mediaId)

  console.log('[Test App Team - 38 Cols] Generated', zones.length, 'zones')
  console.log('[Test App Team - 38 Cols] Sample zone data:')
  console.log(JSON.stringify(zones[0], null, 2))

  // Write buffer to file
  const filename = 'test_app_team_38cols_output.xlsx'
  const filepath = join(__dirname, '..', filename)
  writeFileSync(filepath, buffer)
  console.log('')
  console.log('[Test App Team - 38 Cols] Saved file:', filepath)

  // Verify columns
  const zoneKeys = Object.keys(zones[0])
  console.log('')
  console.log('[Test App Team - 38 Cols] Column Verification:')
  console.log('  Total columns:', zoneKeys.length, '(Expected: 38)')

  // Check for NEW columns (OS and Genre)
  const hasOS = zoneKeys.includes('OS')
  const hasGenre = zoneKeys.includes('Genre')
  const hasDeliveryMethod = zoneKeys.includes('Delivery Method')

  console.log('')
  console.log('[Test App Team - 38 Cols] NEW Columns (March 2026):')
  console.log('  - Column 37 (AK): OS', hasOS ? '✓ PRESENT' : '✗ MISSING')
  console.log('  - Column 38 (AL): Genre', hasGenre ? '✓ PRESENT' : '✗ MISSING')
  console.log('  - Delivery Method (before Genre):', hasDeliveryMethod ? '✓ PRESENT' : '✗ MISSING')

  // Check critical columns
  const hasMediaId = zoneKeys.includes('Media Id')
  const hasPointSite = zoneKeys.includes('Point site domain list')
  const hasInventoryType = zoneKeys.includes('Inventory Type')
  const hasTypeOfZone = zoneKeys.includes('Type of zone')

  console.log('')
  console.log('[Test App Team - 38 Cols] Critical Columns:')
  console.log('  - Media Id:', hasMediaId ? '✓' : '✗', '=', zones[0]['Media Id'])
  console.log('  - Name of zone:', zones[0]['Name of zone'])
  console.log('  - Point site domain list:', hasPointSite ? '✓' : '✗')
  console.log('  - Inventory Type:', hasInventoryType ? '✓' : '✗', '=', zones[0]['Inventory Type'])
  console.log('  - Type of zone:', hasTypeOfZone ? '✓' : '✗', '=', zones[0]['Type of zone'])

  // List all columns
  console.log('')
  console.log('[Test App Team - 38 Cols] All columns:')
  zoneKeys.forEach((key, index) => {
    const colNum = index + 1
    const colLetter = colNum <= 26
      ? String.fromCharCode(64 + colNum)
      : String.fromCharCode(64 + Math.floor((colNum - 1) / 26)) + String.fromCharCode(64 + ((colNum - 1) % 26) + 1)
    const marker = (key === 'OS' || key === 'Genre') ? ' <- NEW!' : ''
    console.log(`  ${colNum}. (${colLetter}) ${key}${marker}`)
  })

  console.log('')
  console.log('[Test App Team - 38 Cols] ✓ SUCCESS! File generated with 38 columns')
  console.log('[Test App Team - 38 Cols] Upload this file to the ad system to verify import works')

} catch (error) {
  console.error('[Test App Team - 38 Cols] ✗ ERROR:', error.message)
  console.error(error.stack)
  process.exit(1)
}
