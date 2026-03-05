/**
 * Count ALL non-empty rows (any column has content)
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
  const dataRows = allRows.slice(2)

  console.log(`\n📊 SALES SHEET - NON-EMPTY ROW COUNT\n`)
  console.log(`Total rows (including headers): ${allRows.length}\n`)

  // Count different categories
  let rowsWithKey = 0
  let rowsWithAnyContent = 0
  let trulyEmptyRows = 0

  const rowsWithoutKey = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNumber = i + 3

    // Check if row has key (Column A)
    const hasKey = row[0] != null && String(row[0]).trim() !== ''

    // Check if row has ANY content in any column
    const hasAnyContent = row && row.some(cell =>
      cell !== null && cell !== undefined && String(cell).trim() !== ''
    )

    if (hasKey) {
      rowsWithKey++
    } else if (hasAnyContent) {
      rowsWithAnyContent++
      rowsWithoutKey.push({
        rowNumber,
        sample: row.slice(0, 10).map(c => c || '_').join('|')
      })
    } else {
      trulyEmptyRows++
    }
  }

  console.log(`Rows with key (Column A): ${rowsWithKey}`)
  console.log(`Rows with content but NO key: ${rowsWithAnyContent}`)
  console.log(`Truly empty rows: ${trulyEmptyRows}`)
  console.log(`Total non-empty rows: ${rowsWithKey + rowsWithAnyContent}`)
  console.log(`\n📊 Database should have: ${rowsWithKey} pipelines\n`)

  if (rowsWithoutKey.length > 0 && rowsWithoutKey.length <= 20) {
    console.log(`⚠️  Rows with content but NO key (not syncing):\n`)
    rowsWithoutKey.forEach(r => {
      console.log(`  Row ${r.rowNumber}: ${r.sample}`)
    })
    console.log('')
  }

  // Show last few data rows
  console.log(`📋 Last 10 data rows (with keys):\n`)
  let shown = 0
  for (let i = dataRows.length - 1; i >= 0 && shown < 10; i--) {
    const row = dataRows[i]
    if (row[0] != null && String(row[0]).trim() !== '') {
      const rowNumber = i + 3
      console.log(`  Row ${rowNumber}: "${String(row[0]).substring(0, 60)}..."`)
      shown++
    }
  }

  console.log('\n✅ Analysis complete!\n')
}

main().catch(console.error)
