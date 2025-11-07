/**
 * Test script for Product Analysis API
 */

const testProductAPI = async () => {
  const baseUrl = 'http://localhost:3001'
  const endpoint = '/api/performance-tracker/deep-dive/product'

  const requestBody = {
    period1: {
      start: '2024-08-01',
      end: '2024-08-31'
    },
    period2: {
      start: '2024-09-01',
      end: '2024-09-30'
    },
    filters: {
      // Add any filters here if needed
    }
  }

  console.log('Testing Product Analysis API...')
  console.log('Request body:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response status:', response.status)

    const data = await response.json()

    if (response.ok) {
      console.log('✅ SUCCESS!')
      console.log('Number of products:', data.data?.length || 0)
      if (data.data && data.data.length > 0) {
        console.log('First product:', JSON.stringify(data.data[0], null, 2))
      }
    } else {
      console.log('❌ ERROR!')
      console.log('Error:', data)
    }
  } catch (error) {
    console.log('❌ FETCH ERROR!')
    console.error('Error:', error.message)
  }
}

testProductAPI()
