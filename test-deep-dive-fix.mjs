/**
 * Test Deep Dive V2 API - Quick test for the AVG() fix
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

async function testDeepDive(testName, requestBody) {
  console.log(`\n📊 Test: ${testName}`)
  console.log('─'.repeat(80))

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Failed (${response.status}): ${errorText.substring(0, 200)}`)
      return false
    }

    const data = await response.json()

    if (data.status === 'error') {
      console.log(`❌ Error: ${data.error}`)
      return false
    }

    console.log(`✅ Success!`)
    console.log(`   Total items: ${data.summary.total_items}`)
    console.log(`   Revenue P1: $${data.summary.total_revenue_p1.toLocaleString('en-US', { minimumFractionDigits: 3 })}`)
    console.log(`   Revenue P2: $${data.summary.total_revenue_p2.toLocaleString('en-US', { minimumFractionDigits: 3 })}`)
    console.log(`   Change: ${data.summary.revenue_change_pct.toFixed(2)}%`)

    // Check if any items have avg_monthly_revenue (for lost items)
    const lostItems = data.data.filter(item => item.status === 'lost')
    if (lostItems.length > 0) {
      console.log(`\n   Lost Items: ${lostItems.length}`)
      const withAvg = lostItems.filter(item => item.avg_monthly_revenue != null)
      console.log(`   Lost items with avg_monthly_revenue: ${withAvg.length}`)
      if (withAvg.length > 0) {
        console.log(`   Sample lost item:`)
        const sample = withAvg[0]
        console.log(`     - Name: ${sample.name || sample.id}`)
        console.log(`     - Avg Monthly Revenue: $${sample.avg_monthly_revenue.toFixed(2)}`)
        console.log(`     - Months with data: ${sample.months_with_data}`)
      }
    }

    return true
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('🧪 Testing Deep Dive V2 API - AVG() Fix Verification\n')
  console.log('API Endpoint:', API_URL)
  console.log('='.repeat(80))

  const tests = [
    {
      name: 'Team Perspective',
      request: {
        perspective: 'team',
        period1: { start: '2024-11-01', end: '2024-11-30' },
        period2: { start: '2024-12-01', end: '2024-12-31' },
        filters: {}
      }
    },
    {
      name: 'PIC Perspective',
      request: {
        perspective: 'pic',
        period1: { start: '2024-11-01', end: '2024-11-30' },
        period2: { start: '2024-12-01', end: '2024-12-31' },
        filters: {}
      }
    },
    {
      name: 'PID Perspective',
      request: {
        perspective: 'pid',
        period1: { start: '2024-11-01', end: '2024-11-30' },
        period2: { start: '2024-12-01', end: '2024-12-31' },
        filters: {}
      }
    },
    {
      name: 'MID Perspective',
      request: {
        perspective: 'mid',
        period1: { start: '2024-11-01', end: '2024-11-30' },
        period2: { start: '2024-12-01', end: '2024-12-31' },
        filters: {}
      }
    },
    {
      name: 'Product Perspective',
      request: {
        perspective: 'product',
        period1: { start: '2024-11-01', end: '2024-11-30' },
        period2: { start: '2024-12-01', end: '2024-12-31' },
        filters: {}
      }
    },
    {
      name: 'Zone Perspective',
      request: {
        perspective: 'zone',
        period1: { start: '2024-11-01', end: '2024-11-30' },
        period2: { start: '2024-12-01', end: '2024-12-31' },
        filters: {}
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    const success = await testDeepDive(test.name, test.request)
    if (success) passed++
    else failed++
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n✨ Testing complete!')
  console.log(`   Passed: ${passed}/${tests.length}`)
  console.log(`   Failed: ${failed}/${tests.length}`)
}

runTests()
