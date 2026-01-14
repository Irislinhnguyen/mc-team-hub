import { google } from 'googleapis'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config({ path: '.env.local' })

const getCredentials = () => {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
  return JSON.parse(fs.readFileSync(path, 'utf-8'))
}

async function checkRow213() {
  const credentials = getCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  const sheets = google.sheets({ version: 'v4', auth })

  // Fetch full row (A:CZ) to see all columns
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_CS!213:213',
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  const row = response.data.values?.[0] || []

  console.log('Row 213 - All columns:')
  console.log('Col A (key):', JSON.stringify(row[0]))
  console.log('Col B (classification):', JSON.stringify(row[1]))
  console.log('Col C (poc):', JSON.stringify(row[2]))
  console.log('Col D (team):', JSON.stringify(row[3]))
  console.log('...')
  console.log('Total columns:', row.length)

  // Check if Column A has newline or special characters
  if (row[0]) {
    const colA = row[0].toString()
    console.log('\nColumn A analysis:')
    console.log('Length:', colA.length)
    console.log('Has newline:', colA.includes('\n'))
    console.log('Has carriage return:', colA.includes('\r'))
    console.log('Raw:', JSON.stringify(colA))

    // Split by newline to see if there are multiple values
    if (colA.includes('\n')) {
      console.log('\nSplit by newline:')
      const parts = colA.split('\n')
      parts.forEach((part, i) => {
        console.log(`  Part ${i+1}:`, JSON.stringify(part))
      })
    }
  }
}

checkRow213().catch(console.error)
