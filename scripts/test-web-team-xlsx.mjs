/**
 * Test Web Team XLSX Generator
 * Uses the actual csvGeneratorWebService to generate a test file
 */

import { generateWebZoneCSV } from '../lib/services/tools/csvGeneratorWebService.js'

// Test parameters for Web Team
const mediaId = '225144'
const mediaName = 'dantri.com'
const products = [
  {
    product: 'StandardBanner',
    quantity: 2,
    sizes: [
      { size: '300x250', quantity: 2 },
      { size: '728x90', quantity: 1 }
    ],
    notes: 'header'
  },
  {
    product: 'AdRecover',
    quantity: 3,
    notes: 'sidebar'
  }
]
const payoutRate = 0.85

console.log('[Test Web Team] Starting XLSX generation...')
console.log('[Test Web Team] Media ID:', mediaId)
console.log('[Test Web Team] Media Name:', mediaName)
console.log('[Test Web Team] Products:', products.length)
console.log('[Test Web Team] Payout Rate:', payoutRate)

try {
  const { buffer, zoneCount } = await generateWebZoneCSV(
    { mediaId, mediaName, products },
    payoutRate
  )

  console.log('[Test Web Team] Generated', zoneCount, 'zones')

  // Write buffer to file
  const filename = 'test_web_team_output.xlsx'
  await import('fs').then(fs => {
    fs.writeFileSync(filename, buffer)
    console.log('[Test Web Team] Saved file:', filename)
  })

  console.log('[Test Web Team] XLSX file generated successfully!')
  console.log('[Test Web Team] You can upload this file to the internal ad system for testing.')

} catch (error) {
  console.error('[Test Web Team] Error:', error.message)
  process.exit(1)
}
