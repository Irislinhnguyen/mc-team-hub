/**
 * Test avg_monthly_revenue calculation for lost items
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

async function testAvgMonthlyRevenue() {
  console.log('🧪 Testing avg_monthly_revenue calculation\n')
  console.log('='.repeat(80))

  // Test with a period that should have some lost items
  const requestBody = {
    perspective: 'pid',
    period1: { start: '2024-10-01', end: '2024-10-31' },
    period2: { start: '2024-12-01', end: '2024-12-31' },
    filters: {}
  }

  console.log('Request Body:')
  console.log(JSON.stringify(requestBody, null, 2))
  console.log('\n' + '─'.repeat(80))

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Failed (${response.status})`)
      console.log(errorText.substring(0, 500))
      return
    }

    const data = await response.json()

    if (data.status === 'error') {
      console.log(`❌ Error: ${data.error}`)
      return
    }

    console.log(`✅ API Response successful!`)
    console.log(`\nSummary:`)
    console.log(`   Total items: ${data.summary.total_items}`)
    console.log(`   Revenue P1: $${data.summary.total_revenue_p1.toFixed(2)}`)
    console.log(`   Revenue P2: $${data.summary.total_revenue_p2.toFixed(2)}`)
    console.log(`   Change: ${data.summary.revenue_change_pct.toFixed(2)}%`)

    // Analyze items by status
    const newItems = data.data.filter(item => item.status === 'new')
    const lostItems = data.data.filter(item => item.status === 'lost')
    const existingItems = data.data.filter(item => item.status === 'existing')

    console.log(`\nStatus Distribution:`)
    console.log(`   New: ${newItems.length}`)
    console.log(`   Lost: ${lostItems.length}`)
    console.log(`   Existing: ${existingItems.length}`)

    // Check lost items
    if (lostItems.length > 0) {
      console.log(`\n📊 Lost Items Analysis:`)
      console.log('─'.repeat(80))

      const withAvg = lostItems.filter(item => item.avg_monthly_revenue != null)
      const withoutAvg = lostItems.filter(item => item.avg_monthly_revenue == null)

      console.log(`   Items with avg_monthly_revenue: ${withAvg.length}`)
      console.log(`   Items without avg_monthly_revenue: ${withoutAvg.length}`)

      if (withAvg.length > 0) {
        console.log(`\n   Top 5 Lost Items with Avg Monthly Revenue:`)
        withAvg
          .sort((a, b) => (b.avg_monthly_revenue || 0) - (a.avg_monthly_revenue || 0))
          .slice(0, 5)
          .forEach((item, i) => {
            console.log(`\n   ${i + 1}. ${item.name || item.id}`)
            console.log(`      - Revenue P1: $${item.rev_p1.toFixed(2)}`)
            console.log(`      - Avg Monthly Revenue: $${item.avg_monthly_revenue.toFixed(2)}`)
            console.log(`      - Months with data: ${item.months_with_data}`)
            console.log(`      - Tier: ${item.tier}`)
          })
      } else {
        console.log(`\n   ⚠️  No lost items have avg_monthly_revenue calculated`)
        console.log(`   This might be expected if there's no historical data`)
      }
    } else {
      console.log(`\n   No lost items found in this period comparison`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Test completed successfully!')

  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`)
    console.error(error)
  }
}

testAvgMonthlyRevenue()
