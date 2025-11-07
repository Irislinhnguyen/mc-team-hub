#!/usr/bin/env node

/**
 * Test Deep Dive API
 *
 * Tests the unified API endpoint across different perspectives
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

const TEST_CASES = [
  {
    name: 'PID Perspective',
    body: {
      perspective: 'pid',
      period1: {
        start: '2025-10-01',
        end: '2025-10-15'
      },
      period2: {
        start: '2025-10-16',
        end: '2025-10-31'
      },
      filters: {}
    }
  },
  {
    name: 'Product Perspective',
    body: {
      perspective: 'product',
      period1: {
        start: '2025-10-01',
        end: '2025-10-15'
      },
      period2: {
        start: '2025-10-16',
        end: '2025-10-31'
      },
      filters: {}
    }
  },
  {
    name: 'MID Perspective with Tier Filter',
    body: {
      perspective: 'mid',
      period1: {
        start: '2025-10-01',
        end: '2025-10-15'
      },
      period2: {
        start: '2025-10-16',
        end: '2025-10-31'
      },
      filters: {},
      tierFilter: 'hero'
    }
  }
]

async function testAPI() {
  console.log('🧪 Testing Deep Dive V2 API\n')
  console.log('API Endpoint:', API_URL)
  console.log('=' .repeat(80) + '\n')

  for (const testCase of TEST_CASES) {
    console.log(`\n📊 Test: ${testCase.name}`)
    console.log('─'.repeat(80))

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.body)
      })

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error('Response:', errorText)
        continue
      }

      const result = await response.json()

      if (result.status === 'ok') {
        console.log(`✅ Success!`)
        console.log(`   Total items: ${result.summary.total_items}`)
        console.log(`   Revenue P1: $${(result.summary.total_revenue_p1 || 0).toLocaleString()}`)
        console.log(`   Revenue P2: $${(result.summary.total_revenue_p2 || 0).toLocaleString()}`)
        console.log(`   Change: ${(result.summary.revenue_change_pct || 0).toFixed(2)}%`)
        console.log(`\n   Tier Distribution:`)
        Object.entries(result.summary.tier_distribution).forEach(([tier, count]) => {
          console.log(`     ${tier}: ${count}`)
        })

        // Show sample enhanced items
        if (result.data && result.data.length > 0) {
          console.log(`\n   Sample item:`)
          const sample = result.data[0]
          console.log(`     ID: ${sample[result.context.perspective === 'product' ? 'product' : config.idField]}`)
          console.log(`     Tier: ${sample.tier}`)
          console.log(`     Tier Status: ${sample.tier_status}`)
          console.log(`     Tier Label: ${sample.tier_label}`)
          if (sample.transition_label) {
            console.log(`     Transition: ${sample.transition_label}`)
          }
        }

      } else {
        console.error(`❌ API Error: ${result.error}`)
      }

    } catch (error) {
      console.error(`❌ Request failed:`, error.message)
    }

    console.log('─'.repeat(80))
  }

  console.log('\n\n✨ Testing complete!\n')
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000')
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  const serverRunning = await checkServer()

  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:3000')
    console.error('Please start the development server with: npm run dev')
    process.exit(1)
  }

  await testAPI()
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
