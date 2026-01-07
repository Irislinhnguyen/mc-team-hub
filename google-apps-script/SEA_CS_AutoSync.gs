/**
 * Auto-Sync Script for SEA_CS Sheet
 *
 * This script automatically syncs changes from Google Sheets to the database
 *
 * Setup Instructions:
 * 1. Open Google Sheet: https://docs.google.com/spreadsheets/d/1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM/edit
 * 2. Go to Extensions → Apps Script
 * 3. Copy this entire file into Code.gs
 * 4. Update WEBHOOK_URL with your deployment domain
 * 5. Set up onEdit trigger (see setup guide)
 */

// ========================================
// Configuration
// ========================================

// ✅ Updated with production domain
const WEBHOOK_URL = 'https://mc-team-hub.vercel.app/api/pipelines/webhook/sheet-changed'

// DO NOT CHANGE these values
const WEBHOOK_TOKEN = 'eb0139d0ca52dd571b6ec8852fcd730af34d96abf245e27a6de7285f4c62fdef'
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_CS'
const DEBOUNCE_SECONDS = 30 // Wait 30 seconds after last edit before syncing

// ========================================
// Main Functions
// ========================================

/**
 * Debounced edit handler
 *
 * Called automatically when sheet is edited
 * Waits DEBOUNCE_SECONDS after last edit before triggering sync
 */
function onEdit(e) {
  try {
    // Only trigger for SEA_CS sheet
    const sheet = e.source.getActiveSheet()
    if (sheet.getName() !== SHEET_NAME) {
      Logger.log('Edit in different sheet, ignoring: ' + sheet.getName())
      return
    }

    Logger.log('Edit detected in SEA_CS sheet')

    // Clear any existing sync triggers to reset debounce timer
    const triggers = ScriptApp.getProjectTriggers()
    let clearedCount = 0

    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'triggerSync') {
        ScriptApp.deleteTrigger(trigger)
        clearedCount++
      }
    })

    if (clearedCount > 0) {
      Logger.log('Cleared ' + clearedCount + ' pending sync trigger(s)')
    }

    // Set new trigger to fire after debounce period
    ScriptApp.newTrigger('triggerSync')
      .timeBased()
      .after(DEBOUNCE_SECONDS * 1000)
      .create()

    Logger.log('Sync scheduled in ' + DEBOUNCE_SECONDS + ' seconds...')

  } catch (error) {
    Logger.log('❌ Error in onEdit: ' + error.message)
    Logger.log(error.stack)
  }
}

/**
 * Trigger sync to backend
 *
 * Called automatically after debounce period
 * Can also be called manually for testing
 */
function triggerSync() {
  try {
    Logger.log('========================================')
    Logger.log('🔄 Triggering sync to backend...')
    Logger.log('========================================')

    // Verify sheet exists
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(SHEET_NAME)

    if (!sheet) {
      Logger.log('❌ Sheet not found: ' + SHEET_NAME)
      return
    }

    // Build webhook payload
    const payload = {
      token: WEBHOOK_TOKEN,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: SHEET_NAME,
      trigger_type: 'edit',
      timestamp: new Date().toISOString(),
      row_count: sheet.getLastRow(),
      user_email: Session.getActiveUser().getEmail()
    }

    Logger.log('Payload:')
    Logger.log('  - Spreadsheet: ' + payload.spreadsheet_id)
    Logger.log('  - Sheet: ' + payload.sheet_name)
    Logger.log('  - Rows: ' + payload.row_count)
    Logger.log('  - User: ' + payload.user_email)

    // Send webhook request
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }

    Logger.log('Sending request to: ' + WEBHOOK_URL)

    const startTime = new Date().getTime()
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const duration = new Date().getTime() - startTime

    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    Logger.log('Response received in ' + duration + 'ms')
    Logger.log('Status: ' + responseCode)

    // Handle response
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

      // Log specific error types
      if (responseCode === 401) {
        Logger.log('Authentication failed - check webhook token')
      } else if (responseCode === 403) {
        Logger.log('Forbidden - spreadsheet ID mismatch')
      } else if (responseCode === 423) {
        Logger.log('Sync is locked/paused for this sheet')
      }
    }

    // Clean up trigger
    cleanupTriggers()

    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Error triggering sync: ' + error.message)
    Logger.log(error.stack)

    // Clean up trigger even on error
    cleanupTriggers()
  }
}

/**
 * Clean up all triggerSync triggers
 */
function cleanupTriggers() {
  const triggers = ScriptApp.getProjectTriggers()
  let cleanedCount = 0

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'triggerSync') {
      ScriptApp.deleteTrigger(trigger)
      cleanedCount++
    }
  })

  if (cleanedCount > 0) {
    Logger.log('Cleaned up ' + cleanedCount + ' trigger(s)')
  }
}

// ========================================
// Manual Testing Functions
// ========================================

/**
 * Manual sync function - for testing
 *
 * Run this from Apps Script editor to test sync manually
 */
function manualSync() {
  Logger.log('========================================')
  Logger.log('🧪 MANUAL SYNC TEST')
  Logger.log('========================================')
  triggerSync()
}

/**
 * Test webhook connection
 *
 * Verifies webhook endpoint is accessible
 */
function testWebhookConnection() {
  try {
    Logger.log('========================================')
    Logger.log('🧪 TESTING WEBHOOK CONNECTION')
    Logger.log('========================================')

    Logger.log('Webhook URL: ' + WEBHOOK_URL)

    // Try GET request for health check
    const healthCheckUrl = WEBHOOK_URL
    Logger.log('Sending GET request to: ' + healthCheckUrl)

    const response = UrlFetchApp.fetch(healthCheckUrl, {
      method: 'get',
      muteHttpExceptions: true
    })

    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    Logger.log('Status: ' + responseCode)

    if (responseCode === 200) {
      Logger.log('✅ Webhook endpoint is accessible')
      try {
        const data = JSON.parse(responseText)
        Logger.log('Response: ' + JSON.stringify(data, null, 2))
      } catch (e) {
        Logger.log('Response: ' + responseText)
      }
    } else {
      Logger.log('⚠️ Unexpected response code: ' + responseCode)
      Logger.log('Response: ' + responseText)
    }

    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Connection test failed: ' + error.message)
    Logger.log(error.stack)
    Logger.log('')
    Logger.log('Possible issues:')
    Logger.log('1. Check WEBHOOK_URL is correct')
    Logger.log('2. Verify deployment is live')
    Logger.log('3. Check network/firewall settings')
    Logger.log('========================================')
  }
}

/**
 * View current configuration
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
 * List all installed triggers
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

// ========================================
// Installation Instructions
// ========================================

/**
 * Display installation instructions
 *
 * Run this function to see setup guide
 */
function showSetupInstructions() {
  Logger.log('========================================')
  Logger.log('AUTO-SYNC SETUP INSTRUCTIONS')
  Logger.log('========================================')
  Logger.log('')
  Logger.log('STEP 1: Update Configuration')
  Logger.log('  - Find WEBHOOK_URL constant at top of this file')
  Logger.log('  - Replace "your-domain.vercel.app" with your actual domain')
  Logger.log('  - Example: https://query-stream-ai.vercel.app/api/pipelines/webhook/sheet-changed')
  Logger.log('')
  Logger.log('STEP 2: Install onEdit Trigger')
  Logger.log('  1. Click clock icon (⏰ Triggers) in left sidebar')
  Logger.log('  2. Click + Add Trigger (bottom right)')
  Logger.log('  3. Configure:')
  Logger.log('     - Function: onEdit')
  Logger.log('     - Deployment: Head')
  Logger.log('     - Event source: From spreadsheet')
  Logger.log('     - Event type: On edit')
  Logger.log('  4. Click Save')
  Logger.log('  5. Authorize when prompted')
  Logger.log('')
  Logger.log('STEP 3: Test Setup')
  Logger.log('  1. Run testWebhookConnection() to verify endpoint')
  Logger.log('  2. Run manualSync() to test sync')
  Logger.log('  3. Edit a cell in SEA_CS sheet')
  Logger.log('  4. Wait 30 seconds')
  Logger.log('  5. Check View → Executions for logs')
  Logger.log('')
  Logger.log('TROUBLESHOOTING:')
  Logger.log('  - Run listTriggers() to verify trigger installed')
  Logger.log('  - Run showConfig() to view current settings')
  Logger.log('  - Check View → Executions for error logs')
  Logger.log('')
  Logger.log('========================================')
}
