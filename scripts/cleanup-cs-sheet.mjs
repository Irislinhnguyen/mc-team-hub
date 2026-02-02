/**
 * Cleanup Orphan Records in CS Sheet
 *
 * This script triggers a sync with delete enabled for the CS sheet
 * via the API endpoint to remove orphan database records.
 *
 * Usage:
 *   node scripts/cleanup-cs-sheet.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║              CLEANUP ORPHAN RECORDS - CS SHEET                         ║
╚════════════════════════════════════════════════════════════════════════╝
`)

async function cleanup() {
  try {
    // Step 1: Find CS sheet
    console.log('📋 STEP 1: Finding CS quarterly sheet...\n')

    const { data: csSheet, error: sheetError } = await supabase
      .from('quarterly_sheets')
      .select('*')
      .eq('group', 'cs')
      .eq('sync_status', 'active')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(1)
      .single()

    if (sheetError || !csSheet) {
      throw new Error('Active CS quarterly sheet not found')
    }

    console.log(`Found: ${csSheet.sheet_name}`)
    console.log(`Quarter: Q${csSheet.quarter} ${csSheet.year}`)
    console.log(`Spreadsheet ID: ${csSheet.spreadsheet_id}`)
    console.log(`Sheet ID: ${csSheet.id}\n`)

    // Step 2: Count current pipelines in database
    console.log('📋 STEP 2: Counting current database records...\n')

    const { count: dbCount, error: countError } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('quarterly_sheet_id', csSheet.id)

    if (countError) {
      throw new Error(`Failed to count pipelines: ${countError.message}`)
    }

    console.log(`Current database count: ${dbCount || 0} pipelines\n`)

    // Step 3: Call API endpoint to trigger sync with delete enabled
    console.log('📋 STEP 3: Triggering sync with DELETE mode enabled...\n')
    console.log('This will:')
    console.log('  1. Fetch all rows from the Google Sheet')
    console.log('  2. Identify orphan database records (deleted from sheet)')
    console.log('  3. Delete the orphan records')
    console.log('  4. Upsert any new/modified rows')
    console.log('')

    // Call the API endpoint using fetch
    // The app needs to be running for this to work
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const syncUrl = `${apiUrl}/api/pipelines/quarterly-sheets/${csSheet.id}/sync?delete=true`

    console.log(`Calling API: ${syncUrl}`)
    console.log('⏳ Starting sync...\n')

    const response = await fetch(syncUrl, { method: 'POST' })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const result = await response.json()

    console.log('\n✅ Sync completed!')
    console.log('')
    console.log('📊 RESULTS:')
    console.log(`  Total processed: ${result.result?.total || 0}`)
    console.log(`  Created: ${result.result?.created || 0}`)
    console.log(`  Updated: ${result.result?.updated || 0}`)
    console.log(`  Deleted: ${result.result?.deleted || 0} ← Orphan records removed`)
    console.log(`  Duration: ${result.result?.duration_ms || 0}ms`)

    // Step 4: Verify new count
    console.log('\n📋 STEP 4: Verifying new database count...\n')

    const { count: newDbCount, error: newCountError } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('quarterly_sheet_id', csSheet.id)

    if (newCountError) {
      throw new Error(`Failed to count new pipelines: ${newCountError.message}`)
    }

    console.log(`New database count: ${newDbCount || 0} pipelines`)
    console.log(`Records removed: ${(dbCount || 0) - (newDbCount || 0)}`)

    if ((result.result?.deleted || 0) > 0) {
      console.log('\n✅ Cleanup successful! Orphan records have been removed.')
    } else {
      console.log('\n✅ Database was already in sync with the Google Sheet.')
    }

    console.log('\n╔════════════════════════════════════════════════════════════════════════╗')
    console.log('║                        CLEANUP COMPLETE                                ║')
    console.log('╚════════════════════════════════════════════════════════════════════════╝\n')

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message)
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.error('')
      console.error('⚠️  Make sure the Next.js dev server is running:')
      console.error('   npm run dev')
    }
    console.error(error.stack)
    process.exit(1)
  }
}

cleanup()
