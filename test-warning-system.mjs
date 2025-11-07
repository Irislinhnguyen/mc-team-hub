/**
 * Test script for the new warning system
 * Tests the /api/performance-tracker/deep-dive endpoint
 */

const API_URL = 'http://localhost:3000/api/performance-tracker/deep-dive'

// Calculate date ranges for testing (last 28 days vs previous 28 days)
function calculateDates() {
  const today = new Date()
  const formatDate = (date) => date.toISOString().split('T')[0]

  const endP2 = new Date(today)
  endP2.setDate(endP2.getDate() - 1)
  const startP2 = new Date(endP2)
  startP2.setDate(startP2.getDate() - 27)

  const endP1 = new Date(startP2)
  endP1.setDate(endP1.getDate() - 1)
  const startP1 = new Date(endP1)
  startP1.setDate(startP1.getDate() - 27)

  return {
    period1: { start: formatDate(startP1), end: formatDate(endP1) },
    period2: { start: formatDate(startP2), end: formatDate(endP2) }
  }
}

async function testWarningSystem() {
  console.log('🧪 Testing Warning System...\n')

  const dates = calculateDates()
  console.log('📅 Date Ranges:')
  console.log(`   Period 1: ${dates.period1.start} to ${dates.period1.end}`)
  console.log(`   Period 2: ${dates.period2.start} to ${dates.period2.end}\n`)

  // Test with PID perspective (publishers)
  const requestBody = {
    perspective: 'pid',
    period1: dates.period1,
    period2: dates.period2,
    filters: {}
  }

  try {
    console.log('🔄 Fetching data from API...\n')

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.status !== 'ok') {
      throw new Error(`API error: ${result.error}`)
    }

    console.log(`✅ Received ${result.data.length} items\n`)

    // Analyze warnings
    const warningStats = {
      healthy: 0,
      info: 0,
      warning: 0,
      critical: 0,
      total: result.data.length
    }

    const examplesByCategory = {
      healthy: [],
      info: [],
      warning: [],
      critical: []
    }

    result.data.forEach(item => {
      const severity = item.warning_severity || 'healthy'
      warningStats[severity]++

      // Store first 2 examples of each category
      if (examplesByCategory[severity].length < 2) {
        examplesByCategory[severity].push({
          name: item.name || item.pid || item.id,
          message: item.warning_message,
          req_change: item.req_change_pct?.toFixed(1),
          rev_change: item.rev_change_pct?.toFixed(1),
          ecpm_p1: item.req_p1 > 0 ? ((item.rev_p1 / item.req_p1) * 1000).toFixed(2) : '0',
          ecpm_p2: item.req_p2 > 0 ? ((item.rev_p2 / item.req_p2) * 1000).toFixed(2) : '0'
        })
      }
    })

    // Display statistics
    console.log('📊 Warning Distribution:')
    console.log(`   ✅ Healthy:  ${warningStats.healthy} (${((warningStats.healthy/warningStats.total)*100).toFixed(1)}%)`)
    console.log(`   ℹ️  Info:     ${warningStats.info} (${((warningStats.info/warningStats.total)*100).toFixed(1)}%)`)
    console.log(`   ⚠️  Warning:  ${warningStats.warning} (${((warningStats.warning/warningStats.total)*100).toFixed(1)}%)`)
    console.log(`   🚨 Critical: ${warningStats.critical} (${((warningStats.critical/warningStats.total)*100).toFixed(1)}%)\n`)

    // Display examples
    if (examplesByCategory.critical.length > 0) {
      console.log('🚨 CRITICAL Examples:')
      examplesByCategory.critical.forEach((ex, i) => {
        console.log(`   ${i+1}. ${ex.name}`)
        console.log(`      Message: ${ex.message}`)
        console.log(`      Metrics: Req Δ ${ex.req_change}%, Rev Δ ${ex.rev_change}%, eCPM: $${ex.ecpm_p1}→$${ex.ecpm_p2}`)
        console.log('')
      })
    }

    if (examplesByCategory.warning.length > 0) {
      console.log('⚠️  WARNING Examples:')
      examplesByCategory.warning.forEach((ex, i) => {
        console.log(`   ${i+1}. ${ex.name}`)
        console.log(`      Message: ${ex.message}`)
        console.log(`      Metrics: Req Δ ${ex.req_change}%, Rev Δ ${ex.rev_change}%, eCPM: $${ex.ecpm_p1}→$${ex.ecpm_p2}`)
        console.log('')
      })
    }

    if (examplesByCategory.info.length > 0) {
      console.log('ℹ️  INFO Examples:')
      examplesByCategory.info.forEach((ex, i) => {
        console.log(`   ${i+1}. ${ex.name}`)
        console.log(`      Message: ${ex.message}`)
        console.log(`      Metrics: Req Δ ${ex.req_change}%, Rev Δ ${ex.rev_change}%, eCPM: $${ex.ecpm_p1}→$${ex.ecpm_p2}`)
        console.log('')
      })
    }

    if (examplesByCategory.healthy.length > 0) {
      console.log('✅ HEALTHY Examples (first 2):')
      examplesByCategory.healthy.forEach((ex, i) => {
        console.log(`   ${i+1}. ${ex.name}`)
        console.log(`      Metrics: Req Δ ${ex.req_change}%, Rev Δ ${ex.rev_change}%, eCPM: $${ex.ecpm_p1}→$${ex.ecpm_p2}`)
        console.log('')
      })
    }

    console.log('✅ Test completed successfully!')
    console.log('\n🌐 View in browser: http://localhost:3000/performance-tracker/deep-dive')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testWarningSystem()
