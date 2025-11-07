// Test Product perspective with team filter
// Expected: Only show products from WEB_GV team (NOT app_standardbanner which is APP team)

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

const testProductTeamFilter = async () => {
  console.log('='.repeat(80))
  console.log('Testing Product Perspective with Team Filter: WEB_GV')
  console.log('='.repeat(80))

  const payload = {
    perspective: 'product',
    period1: {
      start: '2024-10-08',
      end: '2024-11-04'
    },
    period2: {
      start: '2024-10-08',
      end: '2024-11-04'
    },
    filters: {
      team: ['WEB_GV']  // Filter by WEB_GV team
    }
  }

  console.log('\n📤 Request Payload:')
  console.log(JSON.stringify(payload, null, 2))

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return
    }

    const result = await response.json()

    console.log('\n📊 Results:')
    console.log(`Total products returned: ${result.data?.length || 0}`)

    if (result.data && result.data.length > 0) {
      console.log('\n📦 Products list:')
      result.data.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.product || item.name} - Revenue P2: $${(item.rev_p2 || 0).toLocaleString()}`)
      })

      // Check if APP team products are present (BUG indicator)
      const appProducts = result.data.filter(item => {
        const productName = (item.product || item.name || '').toLowerCase()
        return productName.includes('app_')
      })

      if (appProducts.length > 0) {
        console.log('\n❌ BUG DETECTED! Found APP team products when filtering by WEB_GV:')
        appProducts.forEach(item => {
          console.log(`  - ${item.product || item.name}`)
        })
      } else {
        console.log('\n✅ CORRECT! No APP team products found.')
      }

      // Check summary
      if (result.summary) {
        console.log('\n📈 Summary:')
        console.log(`  Total Revenue P2: $${(result.summary.total_rev_p2 || 0).toLocaleString()}`)
        console.log(`  Total Requests P2: ${(result.summary.total_req_p2 || 0).toLocaleString()}`)
        console.log(`  Items Count: ${result.summary.items_count || 0}`)
      }
    } else {
      console.log('\n⚠️ No products returned!')
    }

  } catch (error) {
    console.error('\n❌ Request failed:', error.message)
  }
}

// Run test
testProductTeamFilter()
