/**
 * Test App Team (CS) XLSX Generator
 * Uses the actual csvGeneratorService to generate a test file
 */

import { generateZoneCSV } from '../lib/services/tools/csvGeneratorService.js'

// Test parameters for App Team
const zoneUrl = 'https://apps.apple.com/app/id6752558926'
const userPrompt = 'Create 3 reward zones with FP: 0.4, 0.12, 0.67 respectively - add "_pack 1" at the end of each zone name, and 2 interstitial zones with FP: 0.85, 0.90 - add "_pack 2" at the end'
const payoutRate = 0.85
const mediaId = '225144'

console.log('[Test App Team] Starting XLSX generation...')
console.log('[Test App Team] Zone URL:', zoneUrl)
console.log('[Test App Team] Prompt:', userPrompt)
console.log('[Test App Team] Payout Rate:', payoutRate)
console.log('[Test App Team] Media ID:', mediaId)

try {
  const { buffer, zones } = await generateZoneCSV(zoneUrl, userPrompt, payoutRate, mediaId)

  console.log('[Test App Team] Generated', zones.length, 'zones')
  console.log('[Test App Team] Sample zone:', JSON.stringify(zones[0], null, 2))

  // Write buffer to file
  const filename = 'test_app_team_output.xlsx'
  await import('fs').then(fs => {
    fs.writeFileSync(filename, buffer)
    console.log('[Test App Team] Saved file:', filename)
  })

  // Verify columns
  const zoneKeys = Object.keys(zones[0])
  console.log('[Test App Team] Column count:', zoneKeys.length)
  console.log('[Test App Team] Columns:', zoneKeys)

  // Check critical columns
  const hasMediaId = zoneKeys.includes('Media Id')
  const hasPointSite = zoneKeys.includes('Point site domain list')
  const hasInventoryType = zoneKeys.includes('Inventory Type')
  const hasTypeOfZone = zoneKeys.includes('Type of zone')

  console.log('[Test App Team] Column checks:')
  console.log('  - Media Id:', hasMediaId ? '✓' : '✗', zones[0]['Media Id'])
  console.log('  - Point site domain list:', hasPointSite ? '✓' : '✗')
  console.log('  - Inventory Type:', hasInventoryType ? '✓' : '✗', '=', zones[0]['Inventory Type'])
  console.log('  - Type of zone:', hasTypeOfZone ? '✓' : '✗', '=', zones[0]['Type of zone'])

} catch (error) {
  console.error('[Test App Team] Error:', error.message)
  process.exit(1)
}
