#!/usr/bin/env node

/**
 * CLI Tool for Inspecting Google Sheet Rows
 *
 * Usage: node scripts/inspect-row.mjs <sheet_id> <row_number> [group]
 *
 * Example:
 *   node scripts/inspect-row.mjs 1abc123def456 146 sales
 *   node scripts/inspect-row.mjs 1abc123def456 50 cs
 */

import { getSheetsClient } from '../lib/services/googleSheetsClient.js'
import { transformRowToPipeline, validateRowStructure } from '../lib/services/sheetTransformers.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env.local') })

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('Usage: node scripts/inspect-row.mjs <sheet_id> <row_number> [group]')
    console.error('')
    console.error('Arguments:')
    console.error('  sheet_id    Google Sheet ID (required)')
    console.error('  row_number  Row number to inspect (required, >= 1)')
    console.error('  group       Pipeline group: "sales" or "cs" (default: sales)')
    console.error('')
    console.error('Example:')
    console.error('  node scripts/inspect-row.mjs 1abc123def456 146 sales')
    process.exit(1)
  }

  const [sheetId, rowNumberStr, group = 'sales'] = args
  const rowNumber = parseInt(rowNumberStr)

  if (isNaN(rowNumber) || rowNumber < 1) {
    console.error(colorize('red', 'Error: Invalid row number. Must be >= 1'))
    process.exit(1)
  }

  if (group !== 'sales' && group !== 'cs') {
    console.error(colorize('red', 'Error: Invalid group. Must be "sales" or "cs"'))
    process.exit(1)
  }

  console.log(colorize('cyan', '\n🔍 Row Inspection Tool'))
  console.log(colorize('bold', '='.repeat(60)))
  console.log(`Sheet ID:    ${sheetId}`)
  console.log(`Row Number:  ${rowNumber}`)
  console.log(`Group:       ${group}`)
  console.log(colorize('bold', '='.repeat(60)))

  try {
    // Get Google Sheets client
    const sheets = await getSheetsClient()

    // Fetch the specific row
    console.log(`\n${colorize('blue', '→ Fetching row from Google Sheets...')}`)

    const range = `Sheet1!A${rowNumber}:CZ${rowNumber}`
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range
    })

    const row = response.data.values?.[0]
    if (!row) {
      console.error(colorize('red', `\n❌ Error: Row ${rowNumber} not found or empty`))
      console.error(colorize('yellow', 'Hint: Check if the row number is correct and the sheet has data'))
      process.exit(1)
    }

    console.log(colorize('green', `✅ Row fetched successfully`))
    console.log(colorize('bold', `\n📊 Row Information:`))
    console.log(`  Total columns: ${row.length}`)

    // Validate row structure
    console.log(colorize('bold', `\n🔒 Validation:`))
    const validation = validateRowStructure(row, group)
    if (validation.valid) {
      console.log(colorize('green', `  ✅ Row structure is valid`))
    } else {
      console.log(colorize('red', `  ❌ ${validation.error}`))
    }

    // Show first 30 column values
    console.log(colorize('bold', `\n📋 First 30 Column Values:`))
    const columnLabels = [
      'A (key)', 'B', 'C (PIC)', 'D', 'E', 'F', 'G (Publisher)', 'H', 'I', 'J',
      'K', 'L', 'M', 'N', 'O (Product)', 'P', 'Q', 'R', 'S', 'T',
      'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD'
    ]

    for (let i = 0; i < Math.min(30, row.length); i++) {
      const label = columnLabels[i] || `Col ${i}`
      const value = row[i]
      const displayValue = value != null
        ? (typeof value === 'string' ? `"${value.substring(0, 40)}${value.length > 40 ? '...' : ''}"` : String(value))
        : '(empty)'

      // Highlight important columns
      const isImportantColumn = [0, 2, 6, 14].includes(i) // A, C, G, O
      const color = isImportantColumn ? 'cyan' : 'reset'
      const prefix = isImportantColumn ? '★ ' : '  '

      console.log(`  ${colorize(color, prefix + label + ':')}\t${displayValue}`)
    }

    // Attempt transformation
    console.log(colorize('bold', `\n🔄 Transformation Attempt:`))

    let pipeline = null
    let transformError = null

    try {
      pipeline = transformRowToPipeline(row, 'debug-user', group, 2025)
      console.log(colorize('green', `  ✅ Transformation successful`))

      // Show key fields from transformed pipeline
      console.log(colorize('bold', `\n📦 Transformed Pipeline (key fields):`))
      console.log(`  Key:              ${pipeline.key || '(not set)'}`)
      console.log(`  Publisher:        ${pipeline.publisher || '(not set)'}`)
      console.log(`  Product:          ${pipeline.product || '(not set)'}`)
      console.log(`  PIC/AM:           ${pipeline.poc || '(not set)'}`)
      console.log(`  Status:           ${pipeline.status || '(not set)'}`)
      console.log(`  Progress:         ${pipeline.progress_percent ?? '(not set)'}%`)
      console.log(`  Starting Date:    ${pipeline.starting_date || '(not set)'}`)
      console.log(`  Sheet Row:        ${pipeline.sheet_row_number}`)

      // Check for metadata
      if (pipeline.metadata?.quarterly_breakdown) {
        console.log(colorize('cyan', `  Quarterly:        ✓ breakdown present`))
      }
    } catch (e) {
      transformError = e.message
      console.error(colorize('red', `  ❌ Transformation failed:`))
      console.error(colorize('red', `     ${transformError}`))
    }

    // Summary
    console.log(colorize('bold', `\n${'='.repeat(60)}`))
    if (transformError) {
      console.log(colorize('red', `\n❌ RESULT: Row has transformation errors\n`))
      console.log(colorize('yellow', 'Recommendations:'))
      console.log('  1. Check the error message above for specific issues')
      console.log('  2. Verify data types in the Google Sheet')
      console.log('  3. Look for control characters or special formatting')
      console.log('  4. Ensure required fields (A, C, G) are not empty')
    } else if (!validation.valid) {
      console.log(colorize('yellow', `\n⚠️  RESULT: Row structure is invalid\n`))
      console.log(colorize('yellow', 'Recommendations:'))
      console.log('  1. Ensure the row has enough columns')
      console.log('  2. Check if cells are merged or deleted')
    } else {
      console.log(colorize('green', `\n✅ RESULT: Row is valid and transforms successfully\n`))
    }

  } catch (error) {
    console.error(colorize('red', `\n❌ Unexpected error:`))
    console.error(error.message)
    console.error(colorize('yellow', '\nStack trace:'))
    console.error(error.stack)
    process.exit(1)
  }
}

main()
