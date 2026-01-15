/**
 * Auto-Sync Script for SEA_CS Sheet - FIXED VERSION
 *
 * KEY FIX: Renamed onEdit to handleSheetEdit to avoid conflict with simple trigger
 * This allows UrlFetchApp to work with installable trigger
 */

// Configuration
const WEBHOOK_URL = 'https://mc-team-hub.vercel.app/api/pipelines/webhook/sheet-changed'
const WEBHOOK_TOKEN = '73b622d7437e6ef898b1b6e8774535ab45604d3b1a54fb1ef654d28415c57629'
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_CS'
const DEBOUNCE_SECONDS = 30

/**
 * IMPORTANT: Function renamed from 'onEdit' to 'handleSheetEdit'
 *
 * Why: 'onEdit' is a reserved simple trigger that runs WITHOUT authorization.
 * Simple triggers cannot use UrlFetchApp.
 * By renaming, we ensure ONLY the installable trigger runs.
 */
function handleSheetEdit(e) {
  try {
    // Only trigger for SEA_CS sheet
    const sheet = e.source.getActiveSheet()
    if (sheet.getName() !== SHEET_NAME) {
      return
    }

    const row = e.range.getRow()
    console.log('Row ' + row + ' edited in ' + SHEET_NAME)

    // Try to acquire lock - prevents concurrent syncs
    const lock = LockService.getScriptLock()

    try {
      const lockAcquired = lock.tryLock(10000) // Wait up to 10s

      if (!lockAcquired) {
        console.log('Sync in progress, skipping...')
        return
      }

      // Check debounce - don't sync if recently synced
      const props = PropertiesService.getScriptProperties()
      const lastSyncTime = props.getProperty('lastSyncTime')
      const now = new Date().getTime()

      if (lastSyncTime && (now - parseInt(lastSyncTime)) < DEBOUNCE_SECONDS * 1000) {
        console.log('Debounced - sync recently completed')
        return
      }

      // Update last sync time and trigger sync
      props.setProperty('lastSyncTime', now.toString())
      console.log('Triggering sync...')

      triggerSync()

    } finally {
      lock.releaseLock()
    }

  } catch (error) {
    console.error('Error in handleSheetEdit:', error)
  }
}

/**
 * Trigger sync to backend
 */
function triggerSync() {
  try {
    console.log('========================================')
    console.log('🔄 Triggering sync to backend...')
    console.log('========================================')

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(SHEET_NAME)

    if (!sheet) {
      console.log('❌ Sheet not found: ' + SHEET_NAME)
      return
    }

    // Get user email
    let userEmail = 'unknown'
    try {
      userEmail = Session.getActiveUser().getEmail()
    } catch (e) {
      // Could not get email
    }

    // Build payload - always do full sync
    const payload = {
      token: WEBHOOK_TOKEN,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: SHEET_NAME,
      trigger_type: 'edit',
      timestamp: new Date().toISOString(),
      row_count: sheet.getLastRow(),
      changed_rows: [], // Empty = full sync
      user_email: userEmail
    }

    console.log('Payload:')
    console.log('  - Spreadsheet: ' + payload.spreadsheet_id)
    console.log('  - Sheet: ' + payload.sheet_name)
    console.log('  - Rows: ' + payload.row_count)
    console.log('  - User: ' + payload.user_email)

    // Send webhook
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }

    console.log('Sending request to: ' + WEBHOOK_URL)

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    console.log('Response code: ' + responseCode)

    if (responseCode === 200) {
      console.log('✅ Sync triggered successfully')
      try {
        const responseData = JSON.parse(responseText)
        console.log('Response: ' + JSON.stringify(responseData, null, 2))
      } catch (e) {
        console.log('Response: ' + responseText)
      }
    } else {
      console.log('⚠️ Sync request failed')
      console.log('Status code: ' + responseCode)
      console.log('Response: ' + responseText)

      if (responseCode === 401) {
        console.log('Authentication failed - check webhook token')
      } else if (responseCode === 403) {
        console.log('Forbidden - spreadsheet ID mismatch')
      } else if (responseCode === 423) {
        console.log('Sync is locked/paused for this sheet')
      }
    }

    console.log('========================================')

  } catch (error) {
    console.error('❌ Error triggering sync:', error)
    console.error(error.stack)
  }
}

/**
 * Manual sync for testing
 */
function manualSync() {
  console.log('========================================')
  console.log('🧪 MANUAL SYNC')
  console.log('========================================')

  // Clear debounce before manual sync
  PropertiesService.getScriptProperties().deleteProperty('lastSyncTime')

  triggerSync()
}

/**
 * Test webhook connection
 */
function testWebhookConnection() {
  try {
    console.log('========================================')
    console.log('🧪 TESTING WEBHOOK CONNECTION')
    console.log('========================================')
    console.log('Webhook URL: ' + WEBHOOK_URL)

    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'get',
      muteHttpExceptions: true
    })

    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    console.log('Status: ' + responseCode)

    if (responseCode === 200) {
      console.log('✅ Webhook endpoint is accessible')
      console.log('Response: ' + responseText)
    } else {
      console.log('⚠️ Unexpected response code: ' + responseCode)
    }

    console.log('========================================')

  } catch (error) {
    console.error('❌ Connection test failed:', error)
    console.log('========================================')
  }
}

/**
 * Show current configuration
 */
function showConfig() {
  console.log('========================================')
  console.log('CURRENT CONFIGURATION')
  console.log('========================================')
  console.log('Webhook URL: ' + WEBHOOK_URL)
  console.log('Spreadsheet ID: ' + SPREADSHEET_ID)
  console.log('Sheet Name: ' + SHEET_NAME)
  console.log('Debounce: ' + DEBOUNCE_SECONDS + ' seconds')
  console.log('Token: ' + WEBHOOK_TOKEN.substring(0, 20) + '...')
  console.log('========================================')
}

/**
 * List triggers
 */
function listTriggers() {
  console.log('========================================')
  console.log('INSTALLED TRIGGERS')
  console.log('========================================')

  const triggers = ScriptApp.getProjectTriggers()

  if (triggers.length === 0) {
    console.log('No triggers installed')
    console.log('')
    console.log('⚠️ You need to install the handleSheetEdit trigger:')
    console.log('1. Click clock icon (Triggers) in left sidebar')
    console.log('2. Click + Add Trigger')
    console.log('3. Function: handleSheetEdit (NOT onEdit!)')
    console.log('4. Event source: From spreadsheet')
    console.log('5. Event type: On edit')
  } else {
    triggers.forEach((trigger, index) => {
      console.log((index + 1) + '. Function: ' + trigger.getHandlerFunction())
      console.log('   Event: ' + trigger.getEventType())
      console.log('   Source: ' + trigger.getTriggerSource())
    })
  }

  console.log('========================================')
}

/**
 * Create menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi()
  const menu = ui.createMenu('🔄 Sync Tools')

  menu
    .addItem('🚀 Manual Sync (Full)', 'manualSync')
    .addItem('🔌 Test Webhook Connection', 'testWebhookConnection')
    .addSeparator()
    .addItem('⚙️ Show Config', 'showConfig')
    .addItem('📋 List Triggers', 'listTriggers')
    .addToUi()
}
