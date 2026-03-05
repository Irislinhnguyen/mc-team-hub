/**
 * Find the actual last data row in Sales sheet
 */

import { google } from 'googleapis'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
let credentials
if (credentialsJson) {
  credentials = JSON.parse(credentialsJson)
}

const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_Sales'

async function getAuth() {
  if (!credentials) throw new Error('No credentials')

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
  const dataRows = allRows.slice(2) // Skip headers

  console.log(`\n📊 SALES SHEET DATA ROW ANALYSIS\n`)
  console.log(`Total rows in sheet: ${allRows.length}`)
  console.log(`Data rows (excluding 2 headers): ${dataRows.length}\n`)

  // Find last row with actual data
  let lastDataRow = 0
  let dataRowCount = 0

  for (let i = dataRows.length - 1; i >= 0; i--) {
    const row = dataRows[i]
    const sheetRowNumber = i + 3

    // Check if row has any content
    const hasContent = row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')

    if (hasContent) {
      lastDataRow = sheetRowNumber
      break
    }
  }

  // Count all rows with key (Column A)
  let rowsWithKey = 0
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (row[0] != null && String(row[0]).trim() !== '') {
      rowsWithKey++
    }
  }

  console.log(`Last row with ANY content: Row ${lastDataRow}`)
  console.log(`Rows with key (Column A): ${rowsWithKey}\n`)

  // Show rows around the supposed "row 248"
  console.log(`📋 Rows 245-252 (around row 248 you mentioned):\n`)
  for (let i = 243; i < 252 && i < dataRows.length; i++) {
    const row = dataRows[i]
    const sheetRowNumber = i + 3

    const key = row[0] || '(empty)'
    const publisher = row[6] || '(empty)'
    const hasKey = key !== '(empty)'

    console.log(`Row ${sheetRowNumber}: ${hasKey ? '✅' : '⚪'} Key="${key}" Publisher="${publisher}"`)
  }

  console.log('\n✅ Analysis complete!\n')
}

main().catch(console.error)
