/**
 * Find rows without keys between 1-248
 */

import { google } from 'googleapis'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
const credentials = JSON.parse(credentialsJson)

const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_Sales'

async function getAuth() {
  const { JWT } = await import('google-auth-library')
  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })
  await auth.authorize()
  return auth
}

async function main() {
  const auth = await getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:CZ`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  const allRows = response.data.values || []
  const dataRows = allRows.slice(2) // Skip 2 header rows

  console.log(`\n🔍 FINDING ROWS WITHOUT KEYS (Rows 3-250)\n`)
  console.log(`Total data rows: ${dataRows.length}\n`)

  // Check rows 3-250 (sheet row numbers)
  const missingKeys = []
  const withKeys = []

  for (let i = 0; i < dataRows.length && i < 248; i++) {
    const row = dataRows[i]
    const sheetRowNumber = i + 3 // Row 3 is first data row

    const hasKey = row && row[0] != null && String(row[0]).trim() !== ''

    if (hasKey) {
      withKeys.push({
        rowNumber: sheetRowNumber,
        key: String(row[0]).substring(0, 50)
      })
    } else {
      missingKeys.push({
        rowNumber: sheetRowNumber,
        hasContent: row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''),
        sample: row ? row.slice(0, 15).map(c => c || '_').join(' | ') : '(empty row)'
      })
    }
  }

  console.log(`📊 SUMMARY:\n`)
  console.log(`  Rows 3-250 with keys: ${withKeys.length}`)
  console.log(`  Rows 3-250 without keys: ${missingKeys.length}\n`)

  if (missingKeys.length > 0) {
    console.log(`⚠️  ROWS WITHOUT KEYS (${missingKeys.length} found):\n`)

    missingKeys.forEach((item, index) => {
      console.log(`  ${index + 1}. Row ${item.rowNumber}: ${item.hasContent ? 'Has content in other columns' : 'Completely empty'}`)
      if (item.hasContent) {
        console.log(`     Sample: ${item.sample.substring(0, 80)}...`)
      }
      console.log('')
    })
  } else {
    console.log(`✅ All rows 3-250 have keys!\n`)
  }

  // Show expected database count
  console.log(`📊 EXPECTED DATABASE COUNT: ${withKeys.length} pipelines\n`)

  // Also show which rows have keys (first and last few)
  console.log(`📋 FIRST 5 ROWS WITH KEYS:\n`)
  withKeys.slice(0, 5).forEach(item => {
    console.log(`  Row ${item.rowNumber}: "${item.key}..."`)
  })

  console.log(`\n📋 LAST 5 ROWS WITH KEYS:\n`)
  withKeys.slice(-5).forEach(item => {
    console.log(`  Row ${item.rowNumber}: "${item.key}..."`)
  })

  console.log('\n✅ Analysis complete!\n')
}

main().catch(console.error)
