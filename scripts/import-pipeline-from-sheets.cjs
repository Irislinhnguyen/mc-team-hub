#!/usr/bin/env node

/**
 * Import Pipeline Data from Google Sheets
 *
 * Imports existing pipeline data from Google Sheets into the database
 * Each row in Google Sheets = 1 pipeline record
 * Preserves all monthly forecast data exactly as in the original sheets
 *
 * Usage:
 *   node scripts/import-pipeline-from-sheets.cjs <user-id>
 *   node scripts/import-pipeline-from-sheets.cjs <user-id> --dry-run
 *   node scripts/import-pipeline-from-sheets.cjs <user-id> --sheet SEA_Sales
 *   node scripts/import-pipeline-from-sheets.cjs <user-id> --clear
 *   node scripts/import-pipeline-from-sheets.cjs <user-id> --limit 10
 */

const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const {
  transformRowToPipeline,
  extractMonthlyForecasts,
  validatePipeline
} = require('./lib/sheet-transformers.cjs')

// Load environment variables
dotenv.config({ path: '.env.local' })

// Configuration
// ⚠️ UPDATED TO NEW SHEET (2026-01-07)
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEETS_TO_IMPORT = ['SEA_Sales', 'SEA_CS']

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const shouldClear = args.includes('--clear')
const limitArg = args.find(arg => arg.startsWith('--limit'))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null
const sheetFilter = args.find(arg => arg.startsWith('--sheet'))
const specificSheet = sheetFilter ? sheetFilter.split('=')[1] : null

// Get userId from first non-flag argument (or auto-detect if none provided)
const nonFlagArgs = args.filter(arg => !arg.startsWith('--'))
let userId = nonFlagArgs[0] || null // Will be auto-detected if not provided

/**
 * Initialize Google Sheets API
 */
async function initGoogleSheets() {
  const credentials = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'
  )

  if (!credentials.client_email) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not found in .env.local')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  })

  const sheets = google.sheets({ version: 'v4', auth })

  return sheets
}

/**
 * Initialize Supabase client
 */
function initSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Auto-detect user_id from database
 * First tries to find an admin user, then falls back to the first user
 */
async function getImportUserId() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  // Try to get admin user first
  const { data: adminUsers } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .limit(1)

  if (adminUsers && adminUsers.length > 0) {
    console.log('   ✅ Found admin user:', adminUsers[0].user_id)
    return adminUsers[0].user_id
  }

  // Fallback: get first user from users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1)

  if (!usersError && users && users.length > 0) {
    const detectedUserId = users[0].id
    console.log('   ✅ Using first user:', detectedUserId, `(${users[0].email})`)
    return detectedUserId
  }

  throw new Error('No users found in database')
}

/**
 * Clear existing pipeline data for a group
 */
async function clearGroupPipelines(supabase, userId, group) {
  console.log(`\n🗑️  Clearing existing ${group} pipelines...`)

  // Delete pipelines (cascade will delete forecasts and activities)
  const { error } = await supabase
    .from('pipelines')
    .delete()
    .eq('user_id', userId)
    .eq('group', group)

  if (error) {
    throw new Error(`Failed to clear data: ${error.message}`)
  }

  console.log(`   ✅ Cleared existing ${group} pipelines`)
}

/**
 * Import pipelines from a sheet
 */
async function importPipelinesSheet(sheets, supabase, userId, sheetName, group) {
  console.log(`\n📋 Importing ${sheetName} (${group} group)...`)

  // Read sheet data - use UNFORMATTED_VALUE to get computed values, not formulas
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:CZ`,
    valueRenderOption: 'UNFORMATTED_VALUE'  // Get computed values, not formulas
  })

  const rows = response.data.values
  if (!rows || rows.length < 2) {
    console.log(`   ⚠️  No data in ${sheetName}`)
    return { dealsCount: 0, forecastCount: 0, errors: [] }
  }

  // Headers are in row 2 (index 1), data starts at row 3 (index 2)
  const headers = rows[1]
  const dataRows = rows.slice(2)

  console.log(`   Found ${dataRows.length} data rows`)

  // Apply limit if specified
  const rowsToProcess = limit ? dataRows.slice(0, limit) : dataRows
  console.log(`   Processing ${rowsToProcess.length} rows`)

  // Stats
  let pipelinesCount = 0
  let forecastCount = 0
  let skippedCount = 0
  const errors = []

  // Process each row
  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i]
    const rowNumber = i + 3 // Actual row number in sheet

    try {
      // Skip rows where columns A, B, C are empty
      // Column A (index 0): key
      // Column B (index 1): Classification
      // Column C (index 2): POC
      const colA = row[0] && row[0].toString().trim() !== ''
      const colB = row[1] && row[1].toString().trim() !== ''
      const colC = row[2] && row[2].toString().trim() !== ''

      // Chỉ import nếu cột A, B, C đều có dữ liệu
      if (!colA || !colB || !colC) {
        skippedCount++
        continue
      }

      // Transform row to pipeline object
      const pipeline = transformRowToPipeline(row, userId, group)

      // Validate
      const validationErrors = validatePipeline(pipeline, rowNumber)
      if (validationErrors.length > 0) {
        errors.push(...validationErrors)
        continue
      }

      if (isDryRun) {
        // Dry run: just log what would be inserted
        if (i < 3) { // Show first 3 samples
          console.log(`   [SAMPLE] Row ${rowNumber}:`, {
            name: pipeline.name,
            publisher: pipeline.publisher,
            poc: pipeline.poc,
            group: pipeline.group,
            status: pipeline.status,
            q_gross: pipeline.q_gross
          })
        }
        pipelinesCount++

        // Count forecasts (pass group parameter)
        const forecasts = extractMonthlyForecasts(row, 'dry-run-id', 2025, group)
        forecastCount += forecasts.length
      } else {
        // Insert pipeline
        const { data: insertedPipeline, error: pipelineError } = await supabase
          .from('pipelines')
          .insert(pipeline)
          .select()
          .single()

        if (pipelineError) {
          errors.push(`Row ${rowNumber}: ${pipelineError.message}`)
          continue
        }

        pipelinesCount++

        // Extract and insert monthly forecasts (pass group parameter)
        const forecasts = extractMonthlyForecasts(row, insertedPipeline.id, 2025, group)

        if (forecasts.length > 0) {
          const { error: forecastError } = await supabase
            .from('pipeline_monthly_forecast')
            .insert(forecasts)

          if (forecastError) {
            errors.push(`Row ${rowNumber} forecasts: ${forecastError.message}`)
          } else {
            forecastCount += forecasts.length
          }
        }

        // Log activity
        await supabase.from('pipeline_activity_log').insert({
          pipeline_id: insertedPipeline.id,
          activity_type: 'note',
          notes: `Imported from ${sheetName}`,
          logged_by: userId
        })
      }

      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`   Progress: ${i + 1}/${rowsToProcess.length} rows...`)
      }

    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error.message}`)
    }
  }

  return {
    pipelinesCount,
    forecastCount,
    skippedCount,
    errors
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting Google Sheets Pipeline Import')
  console.log('='.repeat(60))

  // Auto-detect user_id if not provided
  if (!userId) {
    console.log('\n🔍 No user_id provided, auto-detecting...')
    try {
      userId = await getImportUserId()
    } catch (error) {
      console.error('❌ Error: Could not auto-detect user_id')
      console.error(`   ${error.message}`)
      console.log('\nUsage:')
      console.log('  node scripts/import-pipeline-from-sheets.cjs [user-id]')
      console.log('  node scripts/import-pipeline-from-sheets.cjs [user-id] --dry-run')
      console.log('  node scripts/import-pipeline-from-sheets.cjs [user-id] --limit=10')
      console.log('  node scripts/import-pipeline-from-sheets.cjs [user-id] --sheet=SEA_Sales')
      console.log('  node scripts/import-pipeline-from-sheets.cjs [user-id] --clear')
      console.log('\nNote: [user-id] is optional - will auto-detect if not provided')
      process.exit(1)
    }
  }

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No data will be inserted')
  }

  if (limit) {
    console.log(`📊 LIMIT MODE - Processing only ${limit} rows per sheet`)
  }

  if (specificSheet) {
    console.log(`📋 SHEET FILTER - Processing only ${specificSheet}`)
  }

  try {
    // Initialize clients
    console.log('\n🔧 Initializing...')
    const sheets = await initGoogleSheets()
    const supabase = initSupabase()

    console.log('   ✅ Google Sheets API initialized')
    console.log('   ✅ Supabase client initialized')

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error(`User not found: ${userId}`)
    }

    console.log(`   ✅ Authenticated as: ${user.email}`)

    // Determine which sheets to process
    const sheetsToProcess = specificSheet
      ? [specificSheet]
      : SHEETS_TO_IMPORT

    const allResults = {
      totalPipelines: 0,
      totalForecasts: 0,
      totalSkipped: 0,
      allErrors: []
    }

    // Process each sheet separately
    for (const sheetName of sheetsToProcess) {
      // Determine group based on sheet name
      const group = sheetName.includes('Sales') ? 'sales' : 'cs'
      const groupLabel = group === 'sales' ? 'Sales' : 'CS'

      console.log(`\n📦 Processing ${groupLabel} sheet: ${sheetName}...`)

      // Clear existing data if requested
      if (shouldClear && !isDryRun) {
        await clearGroupPipelines(supabase, userId, group)
      }

      // Import pipelines from this sheet
      const result = await importPipelinesSheet(
        sheets,
        supabase,
        userId,
        sheetName,
        group
      )

      allResults.totalPipelines += result.pipelinesCount
      allResults.totalForecasts += result.forecastCount
      allResults.totalSkipped += result.skippedCount
      allResults.allErrors.push(...result.errors)

      console.log(`   ✅ ${sheetName} → ${groupLabel} group: ${result.pipelinesCount} pipelines, ${result.forecastCount} forecasts`)
      if (result.skippedCount > 0) {
        console.log(`   ⚠️  Skipped ${result.skippedCount} empty rows`)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    if (isDryRun) {
      console.log('✅ DRY RUN COMPLETE!')
      console.log(`   Would import ${allResults.totalPipelines} pipelines`)
      console.log(`   Would create ${allResults.totalForecasts} monthly forecasts`)
    } else {
      console.log('✅ IMPORT COMPLETE!')
      console.log(`   Imported ${allResults.totalPipelines} pipelines`)
      console.log(`   Created ${allResults.totalForecasts} monthly forecasts`)
      console.log(`   Skipped ${allResults.totalSkipped} empty rows`)
    }

    if (allResults.allErrors.length > 0) {
      console.log(`\n⚠️  ${allResults.allErrors.length} errors occurred:`)
      allResults.allErrors.slice(0, 10).forEach(err => {
        console.log(`   - ${err}`)
      })
      if (allResults.allErrors.length > 10) {
        console.log(`   ... and ${allResults.allErrors.length - 10} more`)
      }
    }

    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Import failed:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { main }
