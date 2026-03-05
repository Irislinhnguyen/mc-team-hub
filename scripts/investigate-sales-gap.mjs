/**
 * Investigate Sales Sheet Row Gap
 *
 * Sheet: 247 pipelines (248 rows - 1 header)
 * Database: 246 pipelines
 * Gap: 1 pipeline
 *
 * This script will:
 * 1. Fetch all rows from the Sales sheet
 * 2. Check which row is not syncing
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

// Parse credentials JSON
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
let credentials
if (credentialsJson) {
  try {
    credentials = JSON.parse(credentialsJson)
  } catch (e) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON')
    process.exit(1)
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_Sales'

async function getAuth() {
  if (!credentials) {
    throw new Error('No Google credentials found')
  }

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
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║              INVESTIGATE SALES SHEET ROW GAP                           ║
╚════════════════════════════════════════════════════════════════════════╝
`)

  // Step 1: Get quarterly sheet ID
  console.log('📋 STEP 1: Finding Sales quarterly sheet...\n')

  const { data: salesSheet } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .eq('sheet_name', SHEET_NAME)
    .single()

  if (!salesSheet) {
    throw new Error('Sales quarterly sheet not found')
  }

  console.log(`Found: ${salesSheet.sheet_name}`)
  console.log(`Quarterly Sheet ID: ${salesSheet.id}\n`)

  // Step 2: Fetch all pipelines from database
  console.log('📋 STEP 2: Fetching all pipelines from database...\n')

  const { data: dbPipelines } = await supabase
    .from('pipelines')
    .select('id, sheet_row_number, key, publisher')
    .eq('quarterly_sheet_id', salesSheet.id)
    .order('sheet_row_number', { ascending: true })

  console.log(`Database has ${dbPipelines?.length || 0} pipelines`)

  const dbRowNumbers = new Set(dbPipelines?.map(p => p.sheet_row_number) || [])
  console.log(`Row numbers in DB: ${Array.from(dbRowNumbers).sort((a, b) => a - b).slice(0, 20).join(', ')}${dbRowNumbers.size > 20 ? '...' : ''}\n`)

  // Step 3: Fetch all rows from Google Sheet
  console.log('📋 STEP 3: Fetching all rows from Google Sheet...\n')

  const auth = await getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:CZ`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER'
  })

  const allRows = response.data.values || []
  console.log(`Total rows in sheet (including headers): ${allRows.length}`)

  // Skip header rows (rows 1-2 are headers)
  const dataRows = allRows.slice(2)
  console.log(`Data rows (excluding headers): ${dataRows.length}\n`)

  // Step 4: Analyze each row
  console.log('📋 STEP 4: Analyzing rows...\n')

  const validRows = []
  const skippedRows = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const sheetRowNumber = i + 3 // Row 3 is first data row

    // Check if row is empty
    const isEmpty = !row[0] && !row[1] && !row[2]

    // Check if row has key (Column A)
    const hasKey = row[0] != null && String(row[0]).trim() !== ''

    // Check if in database
    const inDb = dbRowNumbers.has(sheetRowNumber)

    if (isEmpty) {
      skippedRows.push({ rowNumber: sheetRowNumber, reason: 'Empty row' })
    } else if (!hasKey) {
      skippedRows.push({ rowNumber: sheetRowNumber, reason: 'No key in Column A' })
    } else if (!inDb) {
      skippedRows.push({
        rowNumber: sheetRowNumber,
        reason: 'NOT IN DATABASE - MISSING!',
        key: String(row[0]),
        publisher: row[6] || 'N/A'
      })
    } else {
      validRows.push({
        rowNumber: sheetRowNumber,
        key: String(row[0]),
        publisher: row[6] || 'N/A'
      })
    }
  }

  console.log(`Valid rows (in DB): ${validRows.length}`)
  console.log(`Skipped rows: ${skippedRows.length}\n`)

  // Step 5: Show missing/interesting rows
  console.log('📋 STEP 5: Rows not syncing to database:\n')

  const missingRows = skippedRows.filter(r => r.reason.includes('MISSING'))
  const actuallySkipped = skippedRows.filter(r => !r.reason.includes('MISSING'))

  if (missingRows.length > 0) {
    console.log('⚠️  MISSING ROWS (in sheet but not in DB):\n')
    missingRows.forEach(r => {
      console.log(`  Row ${r.rowNumber}: ${r.reason}`)
      console.log(`    Key: ${r.key}`)
      console.log(`    Publisher: ${r.publisher}`)
      console.log('')
    })
  }

  if (actuallySkipped.length > 0) {
    console.log('ℹ️  SKIPPED ROWS (expected to be skipped):\n')
    actuallySkipped.slice(0, 10).forEach(r => {
      console.log(`  Row ${r.rowNumber}: ${r.reason}`)
    })
    if (actuallySkipped.length > 10) {
      console.log(`  ... and ${actuallySkipped.length - 10} more`)
    }
    console.log('')
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════════════════╗')
  console.log('║                              SUMMARY                                   ║')
  console.log('╚════════════════════════════════════════════════════════════════════════╝\n')

  console.log(`Sheet data rows: ${dataRows.length}`)
  console.log(`Database records: ${dbPipelines?.length || 0}`)
  console.log(`Valid rows (synced): ${validRows.length}`)
  console.log(`Missing rows: ${missingRows.length}`)
  console.log(`Skipped rows (empty/no key): ${actuallySkipped.length}`)

  if (missingRows.length === 0) {
    console.log('\n✅ All non-empty rows are in the database!')
    console.log(`   The ${dataRows.length - validRows.length} row difference is from skipped empty rows.`)
  } else {
    console.log(`\n⚠️  Found ${missingRows.length} row(s) in sheet that are not in database`)
    console.log('   These rows should be investigated - they may have validation errors')
  }

  console.log('')
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  console.error(error.stack)
  process.exit(1)
})
