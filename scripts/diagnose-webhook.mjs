/**
 * Webhook Diagnostic Script
 *
 * Investigates why webhooks may not be triggering automatic syncs.
 *
 * Usage:
 *   node scripts/diagnose-webhook.mjs
 *
 * Checks:
 * 1. Recent webhook calls in sync logs
 * 2. Quarterly sheet sync status
 * 3. Google Apps Script configuration guidance
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                    WEBHOOK DIAGNOSTIC TOOL                            ║
╚════════════════════════════════════════════════════════════════════════╝
`)

async function diagnose() {
  try {
    // ============================================================
    // STEP 1: Fetch all quarterly sheets
    // ============================================================
    console.log('📋 STEP 1: Fetching quarterly sheets...\n')

    const { data: sheets, error: sheetsError } = await supabase
      .from('quarterly_sheets')
      .select('*')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })

    if (sheetsError) {
      throw new Error(`Failed to fetch quarterly sheets: ${sheetsError.message}`)
    }

    if (!sheets || sheets.length === 0) {
      console.log('⚠️  No quarterly sheets found in database')
      return
    }

    console.log(`Found ${sheets.length} quarterly sheet(s):\n`)

    sheets.forEach(sheet => {
      const lastSync = sheet.last_sync_at
        ? new Date(sheet.last_sync_at).toLocaleString()
        : 'Never'
      const status = sheet.sync_status === 'active' ? '✅ Active' : `⏸️  ${sheet.sync_status}`

      console.log(`  Sheet: ${sheet.sheet_name}`)
      console.log(`  Group: ${sheet.group.toUpperCase()}`)
      console.log(`  Quarter: Q${sheet.quarter} ${sheet.year}`)
      console.log(`  Status: ${status}`)
      console.log(`  Last Sync: ${lastSync}`)
      console.log(`  Spreadsheet ID: ${sheet.spreadsheet_id}`)
      console.log(`  Webhook Token: ${sheet.webhook_token ? sheet.webhook_token.substring(0, 10) + '...' : 'NOT SET'}`)
      console.log('')
    })

    // ============================================================
    // STEP 2: Check recent webhook sync logs
    // ============================================================
    console.log('📋 STEP 2: Checking recent webhook sync logs...\n')

    const { data: recentLogs, error: logsError } = await supabase
      .from('pipeline_sync_log')
      .select('*')
      .eq('user_email', 'Webhook')
      .order('timestamp', { ascending: false })
      .limit(10)

    if (logsError) {
      console.error(`⚠️  Failed to fetch sync logs: ${logsError.message}`)
    } else if (!recentLogs || recentLogs.length === 0) {
      console.log('⚠️  No webhook sync logs found - webhook may never have been triggered!\n')
    } else {
      console.log(`Found ${recentLogs.length} recent webhook sync log(s):\n`)

      recentLogs.forEach((log, index) => {
        const timestamp = new Date(log.created_at).toLocaleString()
        const statusEmoji = log.status === 'success' ? '✅' : log.status === 'partial' ? '⚠️' : '❌'

        console.log(`  ${index + 1}. ${timestamp}`)
        console.log(`     Status: ${statusEmoji} ${log.status.toUpperCase()}`)
        console.log(`     Rows: ${log.rows_processed} processed, ${log.rows_created} created, ${log.rows_updated} updated`)
        console.log(`     Duration: ${log.processing_duration_ms}ms`)
        console.log(`     Sheet: ${log.target_sheet}`)
        if (log.error_message) {
          console.log(`     Error: ${log.error_message.substring(0, 100)}...`)
        }
        console.log('')
      })
    }

    // ============================================================
    // STEP 3: Manual testing instructions
    // ============================================================
    console.log('📋 STEP 3: Manual Testing Instructions\n')
    console.log('To test if the webhook is working:\n')
    console.log('1. Open the Google Sheet for a quarterly sheet')
    console.log('2. Make a small edit to any cell (e.g., add a space)')
    console.log('3. Save the change')
    console.log('4. Run this diagnostic script again')
    console.log('5. Check if a new webhook log appears above\n')

    // ============================================================
    // STEP 4: Google Apps Script checklist
    // ============================================================
    console.log('📋 STEP 4: Google Apps Script Checklist\n')
    console.log('To verify the Google Apps Script is configured correctly:\n')
    console.log('1. Open the Google Sheet')
    console.log('2. Go to Extensions → Apps Script')
    console.log('3. Check the script has:')
    console.log('   - An onEdit(e) or onChange(e) trigger function')
    console.log('   - Webhook URL: https://your-domain.com/api/pipelines/webhook/sheet-changed')
    console.log('   - Correct payload format:')
    console.log('     {')
    console.log('       token: "...",')
    console.log('       spreadsheet_id: "...",')
    console.log('       sheet_name: "...",')
    console.log('       trigger_type: "edit",')
    console.log('       changed_rows: [3, 5, 7]  // ← CRITICAL: Must include row numbers!')
    console.log('     }')
    console.log('4. Check triggers are active:')
    console.log('   - Click Triggers (clock icon)')
    console.log('   - Verify at least one trigger is set up')
    console.log('   - Check "Last run" timestamp\n')

    // ============================================================
    // STEP 5: Webhook endpoint health check
    // ============================================================
    console.log('📋 STEP 5: Webhook Endpoint Health Check\n')
    console.log('Your webhook endpoint should be at:')
    console.log(`  ${supabaseUrl.replace(/\/$/, '').replace('/supabase', '')}/api/pipelines/webhook/sheet-changed\n`)
    console.log('To test it manually, run:')
    console.log(`  curl -X GET "${supabaseUrl.replace(/\/$/, '').replace('/supabase', '')}/api/pipelines/webhook/sheet-changed"\n`)

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('╔════════════════════════════════════════════════════════════════════════╗')
    console.log('║                              SUMMARY                                   ║')
    console.log('╚════════════════════════════════════════════════════════════════════════╝\n')

    const activeSheets = sheets.filter(s => s.sync_status === 'active')
    const inactiveSheets = sheets.filter(s => s.sync_status !== 'active')

    console.log(`Total Sheets: ${sheets.length}`)
    console.log(`  ✅ Active: ${activeSheets.length}`)
    console.log(`  ⏸️  Inactive: ${inactiveSheets.length}`)
    console.log('')

    const recentWebhookCount = recentLogs?.length || 0
    const lastWebhookTime = recentWebhookCount > 0
      ? new Date(recentLogs[0].created_at).toLocaleString()
      : 'Never'

    console.log(`Recent Webhook Calls (last 10): ${recentWebhookCount}`)
    console.log(`Last Webhook Call: ${lastWebhookTime}\n`)

    if (recentWebhookCount === 0) {
      console.log('⚠️  DIAGNOSIS: Webhook has NEVER been triggered!')
      console.log('')
      console.log('Most likely causes:')
      console.log('  1. Google Apps Script trigger not set up')
      console.log('  2. Webhook URL in script is incorrect')
      console.log('  3. Google Apps Script is not sending changed_rows')
      console.log('  4. Trigger is not firing on edits')
      console.log('')
      console.log('Next steps:')
      console.log('  1. Open the Google Sheet → Extensions → Apps Script')
      console.log('  2. Verify the script has a trigger set up')
      console.log('  3. Make a test edit and check if webhook fires')
      console.log('  4. Check server logs for webhook POST requests')
    } else {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentWebhook = recentLogs.find(l => new Date(l.created_at) > oneHourAgo)

      if (recentWebhook) {
        console.log('✅ Webhook is working and syncing!')
      } else {
        console.log('⚠️  Webhook has been triggered before, but NOT in the last hour')
        console.log('')
        console.log('Possible causes:')
        console.log('  1. No edits have been made to the sheet recently')
        console.log('  2. Trigger has stopped working (may need to be recreated)')
        console.log('  3. Google Apps Script quota exceeded')
      }
    }

    console.log('\n✅ Diagnostic complete!\n')

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run diagnostic
diagnose()
