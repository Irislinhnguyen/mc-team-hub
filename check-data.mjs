/**
 * Check what data exists in the table
 */

const checkData = async () => {
  const baseUrl = 'http://localhost:3001'

  // Try to call the metadata API to see what dates are available
  const endpoint = '/api/performance-tracker/metadata'

  console.log('Checking available data...')

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      })
    })

    console.log('Response status:', response.status)

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Metadata fetched!')
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log('❌ ERROR!')
      console.log('Error:', data)
    }
  } catch (error) {
    console.log('❌ FETCH ERROR!')
    console.error('Error:', error.message)
  }
}

checkData()
