/**
 * Auto-Sync Script for SEA_CS and SEA_Sales Sheets - UNIFIED VERSION
 *
 * Handles auto-sync for BOTH CS and Sales sheets in the same spreadsheet
 */

// Configuration
const WEBHOOK_URL = 'https://mc.genieegroup.com/api/pipelines/webhook/sheet-changed'
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SUPPORTED_SHEETS = ['SEA_CS', 'SEA_Sales'] // Both sheets supported
const DEBOUNCE_SECONDS = 30

// Webhook tokens - each sheet has its own token for security
const WEBHOOK_TOKENS = {
  'SEA_CS': '73b622d7437e6ef898b1b6e8774535ab45604d3b1a54fb1ef654d28415c57629',
  'SEA_Sales': 'd1ee7b09894cf2fee7ee665ef80fcdb673bbac099e1ee14a426ed8a6f27371b6'
}

/**
 * Handle edits for BOTH CS and Sales sheets
 */
function handleSheetEdit(e) {
  try {
    // Check if edited sheet is one of our supported sheets
    const sheet = e.source.getActiveSheet()
    const sheetName = sheet.getName()

    if (!SUPPORTED_SHEETS.includes(sheetName)) {
      return // Not our sheet, ignore
    }

    const row = e.range.getRow()
    console.log('Row ' + row + ' edited in ' + sheetName)

    // Try to acquire lock - prevents concurrent syncs
    const lock = LockService.getScriptLock()

    try {
      const lockAcquired = lock.tryLock(10000) // Wait up to 10s

      if (!lockAcquired) {
        console.log('Sync in progress, skipping...')
        return
      }

      // Check debounce - don't sync if recently synced (per sheet)
      const props = PropertiesService.getScriptProperties()
      const lastSyncTimeKey = 'lastSyncTime_' + sheetName
      const lastSyncTime = props.getProperty(lastSyncTimeKey)
      const now = new Date().getTime()

      if (lastSyncTime && (now - parseInt(lastSyncTime)) < DEBOUNCE_SECONDS * 1000) {
        console.log('Debounced - sync recently completed for ' + sheetName)
        return
      }

      // Update last sync time and trigger sync
      props.setProperty(lastSyncTimeKey, now.toString())
      console.log('Triggering sync for ' + sheetName + '...')

      triggerSync(sheetName)

    } finally {
      lock.releaseLock()
    }

  } catch (error) {
    console.error('Error in handleSheetEdit:', error)
  }
}

/**
 * Trigger sync to backend for specific sheet
 */
function triggerSync(sheetName) {
  try {
    console.log('========================================')
    console.log('🔄 Triggering sync for ' + sheetName + '...')
    console.log('========================================')

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(sheetName)

    if (!sheet) {
      console.log('❌ Sheet not found: ' + sheetName)
      return
    }

    // Get user email
    let userEmail = 'unknown'
    try {
      userEmail = Session.getActiveUser().getEmail()
    } catch (e) {
      // Could not get email
    }

    // Get token for this specific sheet
    const token = WEBHOOK_TOKENS[sheetName]
    if (!token) {
      console.log('❌ No webhook token configured for sheet: ' + sheetName)
      return
    }

    // Build payload - always do full sync
    const payload = {
      token: token,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: sheetName,
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
      console.log('✅ Sync triggered successfully for ' + sheetName)
      try {
        const responseData = JSON.parse(responseText)
        console.log('Response: ' + JSON.stringify(responseData, null, 2))
      } catch (e) {
        console.log('Response: ' + responseText)
      }
    } else {
      console.log('⚠️ Sync request failed for ' + sheetName)
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
 * Manual sync for CS sheet
 */
function manualSyncCS() {
  console.log('========================================')
  console.log('🧪 MANUAL SYNC - CS')
  console.log('========================================')

  // Clear debounce before manual sync
  PropertiesService.getScriptProperties().deleteProperty('lastSyncTime_SEA_CS')

  triggerSync('SEA_CS')
}

/**
 * Manual sync for Sales sheet
 */
function manualSyncSales() {
  console.log('========================================')
  console.log('🧪 MANUAL SYNC - SALES')
  console.log('========================================')

  // Clear debounce before manual sync
  PropertiesService.getScriptProperties().deleteProperty('lastSyncTime_SEA_Sales')

  triggerSync('SEA_Sales')
}

/**
 * Manual sync for BOTH sheets
 */
function manualSyncBoth() {
  console.log('========================================')
  console.log('🧪 MANUAL SYNC - BOTH SHEETS')
  console.log('========================================')

  // Clear debounce for both
  const props = PropertiesService.getScriptProperties()
  props.deleteProperty('lastSyncTime_SEA_CS')
  props.deleteProperty('lastSyncTime_SEA_Sales')

  triggerSync('SEA_CS')

  // Wait a bit then sync Sales
  Utilities.sleep(2000)
  triggerSync('SEA_Sales')
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
  console.log('Supported Sheets: ' + SUPPORTED_SHEETS.join(', '))
  console.log('Debounce: ' + DEBOUNCE_SECONDS + ' seconds')
  console.log('')
  console.log('Webhook Tokens:')
  SUPPORTED_SHEETS.forEach(sheet => {
    const token = WEBHOOK_TOKENS[sheet]
    if (token) {
      console.log('  ' + sheet + ': ' + token.substring(0, 20) + '...')
    } else {
      console.log('  ' + sheet + ': NOT CONFIGURED')
    }
  })
  console.log('========================================')

  // Show last sync times
  const props = PropertiesService.getScriptProperties()
  console.log('Last sync times:')
  SUPPORTED_SHEETS.forEach(sheet => {
    const key = 'lastSyncTime_' + sheet
    const lastSync = props.getProperty(key)
    if (lastSync) {
      const date = new Date(parseInt(lastSync))
      console.log('  ' + sheet + ': ' + date.toLocaleString())
    } else {
      console.log('  ' + sheet + ': Never')
    }
  })
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
  const menu = ui.createMenu('🔄 Sync Tools (CS+Sales)')

  menu
    .addSeparator()
    .addItem('🚀 Sync CS Sheet', 'manualSyncCS')
    .addItem('🚀 Sync Sales Sheet', 'manualSyncSales')
    .addItem('🚀 Sync Both Sheets', 'manualSyncBoth')
    .addSeparator()
    .addItem('🔌 Test Webhook Connection', 'testWebhookConnection')
    .addSeparator()
    .addItem('⚙️ Show Config', 'showConfig')
    .addItem('📋 List Triggers', 'listTriggers')
    .addToUi()
}
