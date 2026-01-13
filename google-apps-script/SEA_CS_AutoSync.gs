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

// Track changed rows for incremental sync
const changedRows = new Set()

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

    // Track which row was edited
    const row = e.range.getRow()
    changedRows.add(row)
    Logger.log('Row ' + row + ' modified, tracking for sync')

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
    const rowsArray = Array.from(changedRows)

    // Get user email safely
    let userEmail = 'unknown'
    try {
      userEmail = Session.getActiveUser().getEmail()
    } catch (e) {
      // Could not get email - might be running in a context without user
    }

    const payload = {
      token: WEBHOOK_TOKEN,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: SHEET_NAME,
      trigger_type: 'edit',
      timestamp: new Date().toISOString(),
      row_count: sheet.getLastRow(),
      changed_rows: rowsArray,  // ← NEW: Send changed row numbers
      user_email: userEmail
    }

    Logger.log('Payload:')
    Logger.log('  - Spreadsheet: ' + payload.spreadsheet_id)
    Logger.log('  - Sheet: ' + payload.sheet_name)
    Logger.log('  - Rows: ' + payload.row_count)
    Logger.log('  - Changed rows: ' + rowsArray.join(', '))  // ← NEW log
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

      // Clear changed rows tracking after successful sync
      changedRows.clear()
      Logger.log('Cleared changed rows tracking')
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

// ========================================
// Step-by-Step Test Functions
// ========================================

/**
 * STEP 1: Test Fetch Data
 *
 * Fetches data from Google Sheets and checks for control characters
 * that break JSON parsing
 */
function testFetchData() {
  Logger.log('========================================')
  Logger.log('STEP 1: Testing Google Sheets Fetch')
  Logger.log('========================================')

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(SHEET_NAME)

    if (!sheet) {
      Logger.log('❌ Sheet not found: ' + SHEET_NAME)
      return
    }

    // Fetch all data (start from row 3, skip headers)
    const lastRow = sheet.getLastRow()
    const lastCol = 104 // A:CZ

    Logger.log('Fetching data...')
    Logger.log('  - Sheet: ' + SHEET_NAME)
    Logger.log('  - Data rows: ' + (lastRow - 2) + ' (excluding headers)')
    Logger.log('  - Columns: ' + lastCol)

    const range = sheet.getRange(3, 1, Math.max(lastRow - 2, 1), lastCol)
    const values = range.getValues()

    Logger.log('')
    Logger.log('✅ Fetched ' + values.length + ' rows')
    Logger.log('First row has ' + values[0].length + ' columns')
    Logger.log('')

    // Check for control characters in first 10 rows
    Logger.log('Checking for control characters in first 10 rows...')
    let problematicRows = 0

    for (let i = 0; i < Math.min(10, values.length); i++) {
      const row = values[i]
      const rowNum = i + 3

      try {
        // Try to stringify the row
        JSON.stringify(row)
        Logger.log('✅ Row ' + rowNum + ': Clean')
      } catch (e) {
        Logger.log('❌ Row ' + rowNum + ': Cannot stringify - ' + e.message)
        problematicRows++

        // Find which column has the issue
        for (let j = 0; j < row.length; j++) {
          const cell = row[j]
          if (typeof cell === 'string') {
            // Check for control characters
            if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(cell)) {
              const colLetter = String.fromCharCode(65 + (j > 25 ? 26 : j))
              Logger.log('   → Column ' + colLetter + ' (index ' + j + '): ' + cell.substring(0, 50))
            }
          }
        }
      }
    }

    Logger.log('')
    if (problematicRows > 0) {
      Logger.log('⚠️ Found ' + problematicRows + ' problematic row(s) in first 10')
      Logger.log('')
      Logger.log('NEXT STEPS:')
      Logger.log('1. Run cleanSheetData() to remove control characters')
      Logger.log('2. Re-run testFetchData() to verify clean')
    } else {
      Logger.log('✅ First 10 rows are clean!')
      Logger.log('')
      Logger.log('NEXT STEPS:')
      Logger.log('1. Run testWebhookPayload() to test webhook')
      Logger.log('2. Or run manualSync() to test full sync')
    }

    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Error: ' + error.message)
    Logger.log(error.stack)
    Logger.log('========================================')
  }
}

/**
 * STEP 2: Clean Sheet Data
 *
 * Removes control characters from all cells in the sheet
 * Run this if testFetchData() finds problematic rows
 */
function cleanSheetData() {
  Logger.log('========================================')
  Logger.log('STEP 2: Cleaning Sheet Data')
  Logger.log('========================================')

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(SHEET_NAME)

    if (!sheet) {
      Logger.log('❌ Sheet not found: ' + SHEET_NAME)
      return
    }

    const lastRow = sheet.getLastRow()
    const lastCol = 104 // A:CZ
    const startRow = 3 // Skip headers

    Logger.log('Sheet info:')
    Logger.log('  - Total rows: ' + lastRow)
    Logger.log('  - Columns: ' + lastCol)
    Logger.log('  - Start row: ' + startRow + ' (skip headers)')
    Logger.log('')
    Logger.log('⏳ Cleaning cells... (this may take a while)')

    let cleanedCount = 0
    let checkedCount = 0

    // Clean all cells
    for (let row = startRow; row <= lastRow; row++) {
      for (let col = 1; col <= lastCol; col++) {
        checkedCount++
        const cell = sheet.getRange(row, col)
        const value = cell.getValue()

        if (typeof value === 'string') {
          // Remove control characters and normalize whitespace
          const cleaned = value
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
            .replace(/\n/g, ' ') // Replace newlines with space
            .replace(/\r/g, '') // Remove carriage returns
            .replace(/\t/g, ' ') // Replace tabs with space
            .trim()

          // Only update if changed
          if (cleaned !== value) {
            cell.setValue(cleaned)
            cleanedCount++

            // Log every 100 cleaned cells
            if (cleanedCount % 100 === 0) {
              Logger.log('  → Cleaned ' + cleanedCount + ' cells...')
            }
          }
        }
      }
    }

    Logger.log('')
    Logger.log('✅ Cleaning complete!')
    Logger.log('  - Checked: ' + checkedCount + ' cells')
    Logger.log('  - Cleaned: ' + cleanedCount + ' cells')
    Logger.log('')
    Logger.log('NEXT STEPS:')
    Logger.log('1. Run testFetchData() to verify data is clean')
    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Error: ' + error.message)
    Logger.log(error.stack)
    Logger.log('========================================')
  }
}

/**
 * STEP 3: Test Webhook Payload
 *
 * Creates a test webhook payload to verify it can be stringified
 */
function testWebhookPayload() {
  Logger.log('========================================')
  Logger.log('STEP 3: Testing Webhook Payload')
  Logger.log('========================================')

  try {
    Logger.log('Getting active spreadsheet...')
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

    Logger.log('Getting sheet: ' + SHEET_NAME)
    const sheet = spreadsheet.getSheetByName(SHEET_NAME)

    if (!sheet) {
      Logger.log('❌ Sheet not found: ' + SHEET_NAME)
      return
    }

    Logger.log('✅ Sheet found')
    Logger.log('Fetching sample data...')
    const range = sheet.getRange(3, 1, 5, 104) // First 5 data rows
    const values = range.getValues()

    Logger.log('✅ Fetched ' + values.length + ' rows')
    Logger.log('')

    // Get user email safely
    let userEmail = 'test@example.com'
    try {
      userEmail = Session.getActiveUser().getEmail()
    } catch (e) {
      Logger.log('⚠️ Could not get user email, using test email')
    }

    // Create webhook payload (simulate what triggerSync sends)
    const payload = {
      token: WEBHOOK_TOKEN,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: SHEET_NAME,
      trigger_type: 'test',
      timestamp: new Date().toISOString(),
      row_count: sheet.getLastRow(),
      changed_rows: [3, 4, 5], // Sample changed rows
      user_email: userEmail,
      sample_data: values[0] // Include first row as sample
    }

    Logger.log('Creating webhook payload...')
    Logger.log('  - Token: ' + payload.token.substring(0, 20) + '...')
    Logger.log('  - Spreadsheet: ' + payload.spreadsheet_id)
    Logger.log('  - Sheet: ' + payload.sheet_name)
    Logger.log('  - Trigger: ' + payload.trigger_type)
    Logger.log('  - Rows: ' + payload.row_count)
    Logger.log('  - Changed rows: ' + payload.changed_rows.join(', '))
    Logger.log('')

    // Try to stringify
    try {
      const jsonStr = JSON.stringify(payload)
      Logger.log('✅ Payload created successfully!')
      Logger.log('  - Size: ' + jsonStr.length + ' characters')
      Logger.log('  - Sample: ' + jsonStr.substring(0, 200) + '...')
      Logger.log('')
      Logger.log('NEXT STEPS:')
      Logger.log('1. Run testSyncEndpoint() to test sending to webhook')
      Logger.log('2. Or run manualSync() to test full sync')
    } catch (e) {
      Logger.log('❌ Cannot stringify payload: ' + e.message)
      Logger.log('')
      Logger.log('This means there are still control characters in the data.')
      Logger.log('Run cleanSheetData() again and check for any missed cells.')
    }

    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Error: ' + error.message)
    Logger.log(error.stack)
    Logger.log('========================================')
  }
}

/**
 * STEP 4: Test Sync Endpoint
 *
 * Sends a test request to the sync webhook endpoint
 */
function testSyncEndpoint() {
  Logger.log('========================================')
  Logger.log('STEP 4: Testing Sync Endpoint')
  Logger.log('========================================')

  try {
    // Get user email safely
    let userEmail = 'test@example.com'
    try {
      userEmail = Session.getActiveUser().getEmail()
    } catch (e) {
      Logger.log('⚠️ Could not get user email, using test email')
    }

    // Create test payload
    const payload = {
      token: WEBHOOK_TOKEN,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: SHEET_NAME,
      trigger_type: 'test',
      timestamp: new Date().toISOString(),
      row_count: 100,
      changed_rows: [3, 4, 5],
      user_email: userEmail
    }

    Logger.log('Sending test request to webhook...')
    Logger.log('  - URL: ' + WEBHOOK_URL)
    Logger.log('  - Trigger: ' + payload.trigger_type)
    Logger.log('  - Changed rows: ' + payload.changed_rows.join(', '))
    Logger.log('')

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }

    const startTime = new Date().getTime()
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const duration = new Date().getTime() - startTime

    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    Logger.log('Response received in ' + duration + 'ms')
    Logger.log('Status: ' + responseCode)
    Logger.log('')

    if (responseCode === 200) {
      Logger.log('✅ Webhook endpoint is working!')
      try {
        const responseData = JSON.parse(responseText)
        Logger.log('Response: ' + JSON.stringify(responseData, null, 2))
      } catch (e) {
        Logger.log('Response: ' + responseText)
      }
      Logger.log('')
      Logger.log('NEXT STEPS:')
      Logger.log('1. Run manualSync() to test full sync with real data')
    } else {
      Logger.log('⚠️ Webhook returned error:')
      Logger.log('  - Status: ' + responseCode)
      Logger.log('  - Response: ' + responseText)
      Logger.log('')
      Logger.log('Common issues:')
      Logger.log('  - 401: Token mismatch')
      Logger.log('  - 403: Spreadsheet ID mismatch')
      Logger.log('  - 423: Sync is paused for this sheet')
      Logger.log('  - 500: Server error (check logs)')
    }

    Logger.log('========================================')

  } catch (error) {
    Logger.log('❌ Error: ' + error.message)
    Logger.log(error.stack)
    Logger.log('========================================')
  }
}

/**
 * Create custom menu when sheet opens
 *
 * Adds a "Sync Tools" menu to the Google Sheets UI
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi()
  const menu = ui.createMenu('🔄 Sync Tools')

  menu
    .addItem('📊 Test Fetch Data', 'testFetchData')
    .addItem('🧹 Clean Sheet Data', 'cleanSheetData')
    .addSeparator()
    .addItem('📦 Test Webhook Payload', 'testWebhookPayload')
    .addItem('🌐 Test Sync Endpoint', 'testSyncEndpoint')
    .addSeparator()
    .addItem('🚀 Manual Sync (Full)', 'manualSync')
    .addItem('🔌 Test Webhook Connection', 'testWebhookConnection')
    .addSeparator()
    .addItem('⚙️ Show Config', 'showConfig')
    .addItem('📋 List Triggers', 'listTriggers')
    .addItem('📖 Setup Instructions', 'showSetupInstructions')
    .addToUi()
}
