/**
 * Simple Auto-Sync Script for SEA_CS Sheet
 *
 * Simplified version - calls sync directly from onEdit
 * Uses PropertiesService for debounce tracking
 */

// Configuration
const WEBHOOK_URL = 'https://mc-team-hub.vercel.app/api/pipelines/webhook/sheet-changed'
const WEBHOOK_TOKEN = '73b622d7437e6ef898b1b6e8774535ab45604d3b1a54fb1ef654d28415c57629'
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_CS'
const DEBOUNCE_SECONDS = 30

/**
 * Main edit handler - calls sync directly with debounce + lock
 */
function onEdit(e) {
  try {
    // Only trigger for SEA_CS sheet
    const sheet = e.source.getActiveSheet()
    if (sheet.getName() !== SHEET_NAME) {
      return
    }

    const row = e.range.getRow()
    Logger.log('Row ' + row + ' edited in ' + SHEET_NAME)

    // Try to acquire lock - prevents concurrent syncs
    const lock = LockService.getScriptLock()

    try {
      const lockAcquired = lock.tryLock(10000) // Wait up to 10s

      if (!lockAcquired) {
        Logger.log('Sync in progress, skipping...')
        return
      }

      // Check debounce - don't sync if recently synced
      const props = PropertiesService.getScriptProperties()
      const lastSyncTime = props.getProperty('lastSyncTime')
      const now = new Date().getTime()

      if (lastSyncTime && (now - parseInt(lastSyncTime)) < DEBOUNCE_SECONDS * 1000) {
        Logger.log('Debounced - sync recently completed')
        return
      }

      // Update last sync time and trigger sync
      props.setProperty('lastSyncTime', now.toString())
      Logger.log('Triggering sync...')

      triggerSync()

    } finally {
      lock.releaseLock()
    }

  } catch (error) {
    Logger.log('❌ Error in onEdit: ' + error.message)
  }
}

/**
 * Trigger sync to backend
 */
function triggerSync() {
  try {
    Logger.log('========================================')
    Logger.log('🔄 Triggering sync to backend...')
    Logger.log('========================================')

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(SHEET_NAME)

    if (!sheet) {
      Logger.log('❌ Sheet not found: ' + SHEET_NAME)
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

    Logger.log('Payload:')
    Logger.log('  - Spreadsheet: ' + payload.spreadsheet_id)
    Logger.log('  - Sheet: ' + payload.sheet_name)
    Logger.log('  - Rows: ' + payload.row_count)
    Logger.log('  - User: ' + payload.user_email)

    // Send webhook
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }

    Logger.log('Sending request to: ' + WEBHOOK_URL)

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    Logger.log('Status: ' + responseCode)

    if (responseCode === 200) {
      Logger.log('✅ Sync triggered successfully')
      try {
        const responseData = JSON.parse(responseText)
        Logger.log('Response: ' + JSON.stringify(responseData, null, 2))
      } catch (e) {
        Logger.log('Response: ' + responseText)
      }
    } else {
      Logger.log('⚠️ Sync request failed')
      Logger.log('Status code: ' + responseCode)
      Logger.log('Response: ' + responseText)

      if (responseCode === 401) {
        Logger.log('Authentication failed - check webhook token')
      } else if (responseCode === 403) {
        Logger.log('Forbidden - spreadsheet ID mismatch')
      } else if (responseCode === 423) {
        Logger.log('Sync is locked/paused for this sheet')
      }
    }

    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Error triggering sync: ' + error.message)
    Logger.log(error.stack)
  }
}

/**
 * Manual sync for testing
 */
function manualSync() {
  Logger.log('========================================')
  Logger.log('🧪 MANUAL SYNC')
  Logger.log('========================================')

  // Clear debounce before manual sync
  PropertiesService.getScriptProperties().deleteProperty('lastSyncTime')

  triggerSync()
}

/**
 * Test webhook connection
 */
function testWebhookConnection() {
  try {
    Logger.log('========================================')
    Logger.log('🧪 TESTING WEBHOOK CONNECTION')
    Logger.log('========================================')
    Logger.log('Webhook URL: ' + WEBHOOK_URL)

    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'get',
      muteHttpExceptions: true
    })

    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    Logger.log('Status: ' + responseCode)

    if (responseCode === 200) {
      Logger.log('✅ Webhook endpoint is accessible')
      Logger.log('Response: ' + responseText)
    } else {
      Logger.log('⚠️ Unexpected response code: ' + responseCode)
    }

    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Connection test failed: ' + error.message)
    Logger.log('========================================')
  }
}

/**
 * Show current configuration
 */
function showConfig() {
  Logger.log('========================================')
  Logger.log('CURRENT CONFIGURATION')
  Logger.log('========================================')
  Logger.log('Webhook URL: ' + WEBHOOK_URL)
  Logger.log('Spreadsheet ID: ' + SPREADSHEET_ID)
  Logger.log('Sheet Name: ' + SHEET_NAME)
  Logger.log('Debounce: ' + DEBOUNCE_SECONDS + ' seconds')
  Logger.log('Token: ' + WEBHOOK_TOKEN.substring(0, 20) + '...')
  Logger.log('========================================')
}

/**
 * List triggers
 */
function listTriggers() {
  Logger.log('========================================')
  Logger.log('INSTALLED TRIGGERS')
  Logger.log('========================================')

  const triggers = ScriptApp.getProjectTriggers()

  if (triggers.length === 0) {
    Logger.log('No triggers installed')
    Logger.log('')
    Logger.log('⚠️ You need to install the onEdit trigger:')
    Logger.log('1. Click clock icon (Triggers) in left sidebar')
    Logger.log('2. Click + Add Trigger')
    Logger.log('3. Function: onEdit')
    Logger.log('4. Event source: From spreadsheet')
    Logger.log('5. Event type: On edit')
  } else {
    triggers.forEach((trigger, index) => {
      Logger.log((index + 1) + '. ' + trigger.getHandlerFunction())
      Logger.log('   Event: ' + trigger.getEventType())
      Logger.log('   Source: ' + trigger.getTriggerSource())
    })
  }

  Logger.log('========================================')
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
