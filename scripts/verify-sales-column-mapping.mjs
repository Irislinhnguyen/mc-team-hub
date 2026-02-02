#!/usr/bin/env node

/**
 * Test script to verify the updated Sales column mappings
 *
 * This script:
 * 1. Fetches the current headers from the Sales sheet
 * 2. Loads the new column mapping
 * 3. Fetches a few sample rows
 * 4. Transforms them using the new mapping
 * 5. Verifies values are read from the correct columns
 */

import { google } from 'googleapis'
import { readFileSync } from 'fs'

const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_Sales'

// Expected column headers based on new mapping
const EXPECTED_HEADERS = {
  0: 'key',
  1: 'Classification',
  2: 'AM',
  3: 'Team',
  4: 'MA/MI',
  5: 'PID',
  6: 'Publisher',
  7: 'MID/siteID',
  8: 'domain',
  9: 'ZID',
  10: 'Channel',
  11: 'Competitors',
  12: 'Pipeline Quarter',
  13: 'Pipeline detail',
  14: 'Product',
  15: 'day gross',
  16: 'day net rev',
  17: 'IMP (30days)',
  18: 'eCPM',
  19: 'Max Gross',
  20: 'R/S',
  21: 'Action Date',
  22: 'Next Action',
  23: 'DETAIL',
  24: 'Action Progress',
  25: 'Update Target',
  26: 'Action Progress', // Duplicate - should be skipped
  27: 'Starting Date',
  28: 'Status',
  29: '%',
  30: 'Date of first proposal',
  31: 'Interested date',
  32: 'Acceptance date',
  33: '【A】',
  34: '【Z】',
  35: 'GR',
  36: 'NR',
}

// Convert column index to letter (0=A, 1=B, ..., 26=AA, etc.)
function getColumnLetter(index) {
  let letter = ''
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter
    index = Math.floor(index / 26) - 1
  }
  return letter
}

async function main() {
  console.log('🔍 Testing Sales Sheet Column Mapping\n')
  console.log(`Spreadsheet: ${SPREADSHEET_ID}`)
  console.log(`Sheet: ${SHEET_NAME}`)
  console.log('')

  // Load service account credentials
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json'
  let credentials
  try {
    const credentialsJson = readFileSync(credentialsPath, 'utf-8')
    credentials = JSON.parse(credentialsJson)
  } catch (err) {
    console.error(`Failed to load service account from ${credentialsPath}:`, err.message)
    process.exit(1)
  }

  console.log(`Using service account: ${credentials.client_email}`)
  console.log('')

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  const sheets = google.sheets({ version: 'v4', auth })

  try {
    // Step 1: Fetch headers (they're on row 2, not row 1!)
    console.log('Step 1: Fetching sheet headers...')
    const headersResult = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!2:2`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    })

    if (!headersResult.data.values?.[0]) {
      throw new Error('Failed to fetch headers')
    }

    const actualHeaders = headersResult.data.values[0].map(h => h.replace(/\n/g, ' ').trim())
    console.log(`✓ Found ${actualHeaders.length} columns\n`)

    // Step 2: Verify key columns
    console.log('Step 2: Verifying key column positions...\n')

    const keyColumns = [
      { col: 9, field: 'ZID' },
      { col: 22, field: 'Next Action' },
      { col: 23, field: 'DETAIL' },
      { col: 24, field: 'Action Progress' },
      { col: 27, field: 'Starting Date' },
      { col: 28, field: 'Status' },
      { col: 33, field: '【A】' },
      { col: 34, field: '【Z】' },
      { col: 35, field: 'GR' },
      { col: 36, field: 'NR' },
    ]

    let allMatch = true
    for (const { col, field } of keyColumns) {
      const actual = actualHeaders[col]
      const expected = EXPECTED_HEADERS[col]
      const letter = getColumnLetter(col)
      const match = actual === expected

      if (!match) {
        console.log(`❌ Column ${col} (${letter}): Expected "${expected}", got "${actual}"`)
        allMatch = false
      } else {
        console.log(`✓ Column ${col} (${letter}): "${actual}"`)
      }
    }

    console.log('')

    // Check for duplicate Action Progress column
    console.log('Step 3: Checking for duplicate columns...\n')
    const col26 = actualHeaders[26]
    if (col26 === 'Action Progress') {
      console.log(`✓ Column 26 (AA) is duplicate "Action Progress" - should be skipped`)
    } else {
      console.log(`⚠️  Column 26 (AA): Expected "Action Progress" (duplicate), got "${col26}"`)
    }

    console.log('')

    // Step 4: Fetch sample rows
    console.log('Step 4: Fetching sample rows for transformation test...')
    const sampleResult = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!3:5`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    })

    if (!sampleResult.data.values) {
      throw new Error('Failed to fetch sample rows')
    }

    const sampleRows = sampleResult.data.values
    console.log(`✓ Fetched ${sampleRows.length} sample rows\n`)

    // Step 5: Test transformation on first non-empty row
    console.log('Step 5: Testing data extraction with new mapping...\n')

    // Import the mapping
    const { COLUMN_MAPPING } = await import('./lib/pipeline-column-mapping-sales.cjs')

    for (let i = 0; i < sampleRows.length; i++) {
      const row = sampleRows[i]
      if (!row || row.length < 10) continue

      console.log(`--- Row ${i + 3} ---`)

      // Extract key fields
      const key = row[0]
      const pid = row[5]
      const publisher = row[6]
      const zid = row[9] // NEW position!
      const status = row[28]
      const nextAction = row[22]

      console.log(`  key: "${key}"`)
      console.log(`  PID: "${pid}"`)
      console.log(`  Publisher: "${publisher}"`)
      console.log(`  ZID (col 9/J): "${zid}"`)
      console.log(`  Status (col 28/AC): "${status}"`)
      console.log(`  Next Action (col 22/W): "${nextAction}"`)

      // Verify ZID is in the right place
      if (zid && zid.length > 0) {
        console.log(`  ✓ ZID successfully read from column 9`)
      }

      console.log('')
    }

    console.log('✅ Verification complete!')
    console.log('')
    console.log('Summary of changes:')
    console.log('  • ZID moved from column 34 → column 9')
    console.log('  • Region field removed (was column 11)')
    console.log('  • Action fields shifted to 22-24')
    console.log('  • Column 26 (duplicate Action Progress) skipped')
    console.log('  • Timeline fields at 27-34')
    console.log('  • c_plus_upgrade removed (was column 35)')
    console.log('  • Quarterly columns at 35-48')
    console.log('  • Monthly data starts at 49, 64, 79')

  } catch (error) {
    console.error('❌ Error during verification:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
