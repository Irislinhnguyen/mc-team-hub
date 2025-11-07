#!/usr/bin/env node

/**
 * Debug PIC data structure
 */

console.log('🔍 Debugging PIC Data Structure\n')

const payload = {
  perspective: 'pic',
  period1: { start: '2025-10-01', end: '2025-10-15' },
  period2: { start: '2025-10-16', end: '2025-10-31' },
  filters: {}
}

try {
  const response = await fetch('http://localhost:3000/api/performance-tracker/deep-dive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const result = await response.json()

  if (result.status !== 'ok') {
    console.error('❌ Error:', result.error)
    process.exit(1)
  }

  console.log(`Found ${result.data.length} PICs\n`)

  // Show first 3 PICs with full structure
  console.log('Sample PIC data structures:\n')
  result.data.slice(0, 3).forEach((pic, idx) => {
    console.log(`PIC ${idx + 1}:`)
    console.log(JSON.stringify(pic, null, 2))
    console.log()
  })

  // Check which field contains PIC name
  const firstPic = result.data[0]
  console.log('Fields in PIC object:')
  Object.keys(firstPic).forEach(key => {
    console.log(`  ${key}: ${firstPic[key]}`)
  })

} catch (error) {
  console.error('❌ Error:', error.message)
}
