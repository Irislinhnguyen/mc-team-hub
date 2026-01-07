# CS Sheet Auto-Sync Setup Guide

## ✅ Completed Steps

1. **Database Migration** ✅
   - Added `zid` column to pipelines table
   - Added `closed_date` column to pipelines table
   - Disabled auto-set dates trigger
   - All dates now synced directly from Google Sheet

2. **Column Mapping** ✅
   - Created CS-specific mapping: `scripts/lib/pipeline-column-mapping-cs.cjs`
   - Updated transformer to dynamically load mappings based on group
   - Updated sync service with all syncable fields

3. **Data Import** ✅
   - Imported **296 CS pipelines** from SEA_CS sheet
   - Created **4440 monthly forecasts** (15 months per pipeline)
   - Total CS pipelines in database: **1,108** (including historical)

4. **Quarterly Sheet Registration** ✅
   - Registered SEA_CS sheet for Q4 2025
   - Generated webhook token for authentication
   - Status: `active`

---

## 🔧 Auto-Sync Setup

### Sheet Information

- **Spreadsheet ID**: `1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM`
- **Sheet Name**: `SEA_CS`
- **Group**: `cs`
- **Quarterly Sheet ID**: `0aaba63e-4635-480b-85b0-89fd63267d8a`
- **Webhook Token**: `eb0139d0ca52dd571b6ec8852fcd730af34d96abf245e27a6de7285f4c62fdef`

### Webhook Endpoint

```
POST https://your-domain.vercel.app/api/pipelines/webhook/sheet-changed
```

---

## 📝 Google Apps Script Setup

### Step 1: Open Script Editor

1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM/edit
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code in `Code.gs`

### Step 2: Add Auto-Sync Script

Paste the following code into `Code.gs`:

```javascript
/**
 * Auto-Sync Script for SEA_CS Sheet
 * Triggers webhook when sheet is edited
 */

// Configuration
const WEBHOOK_URL = 'https://your-domain.vercel.app/api/pipelines/webhook/sheet-changed'
const WEBHOOK_TOKEN = 'eb0139d0ca52dd571b6ec8852fcd730af34d96abf245e27a6de7285f4c62fdef'
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
const SHEET_NAME = 'SEA_CS'

/**
 * Debounced edit handler - waits 30 seconds after last edit
 */
function onEdit(e) {
  // Only trigger for SEA_CS sheet
  const sheet = e.source.getActiveSheet()
  if (sheet.getName() !== SHEET_NAME) {
    return
  }

  // Clear any existing trigger
  const triggers = ScriptApp.getProjectTriggers()
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'triggerSync') {
      ScriptApp.deleteTrigger(trigger)
    }
  })

  // Set new trigger to fire in 30 seconds
  ScriptApp.newTrigger('triggerSync')
    .timeBased()
    .after(30 * 1000) // 30 seconds
    .create()

  Logger.log('Sync scheduled in 30 seconds...')
}

/**
 * Trigger sync to backend
 */
function triggerSync() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(SHEET_NAME)

    if (!sheet) {
      Logger.log('Sheet not found: ' + SHEET_NAME)
      return
    }

    const payload = {
      token: WEBHOOK_TOKEN,
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: SHEET_NAME,
      trigger_type: 'edit',
      timestamp: new Date().toISOString(),
      row_count: sheet.getLastRow(),
      user_email: Session.getActiveUser().getEmail()
    }

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }

    Logger.log('Sending sync request to: ' + WEBHOOK_URL)
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    if (responseCode === 200) {
      Logger.log('✅ Sync triggered successfully')
      Logger.log('Response: ' + responseText)
    } else {
      Logger.log('⚠️ Sync request returned status: ' + responseCode)
      Logger.log('Response: ' + responseText)
    }

    // Clean up trigger
    const triggers = ScriptApp.getProjectTriggers()
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'triggerSync') {
        ScriptApp.deleteTrigger(trigger)
      }
    })

  } catch (error) {
    Logger.log('❌ Error triggering sync: ' + error.message)
  }
}

/**
 * Manual sync function - for testing
 */
function manualSync() {
  Logger.log('🔄 Manual sync triggered...')
  triggerSync()
}

/**
 * Test webhook connection
 */
function testWebhook() {
  try {
    const healthCheckUrl = WEBHOOK_URL.replace('/sheet-changed', '/sheet-changed')
    const response = UrlFetchApp.fetch(healthCheckUrl + '?health=check')
    Logger.log('Webhook health check: ' + response.getContentText())
  } catch (error) {
    Logger.log('❌ Webhook test failed: ' + error.message)
  }
}
```

### Step 3: Update Configuration

**IMPORTANT**: Replace `your-domain.vercel.app` with your actual deployment domain in the `WEBHOOK_URL` constant.

If deployed on Vercel, it should be something like:
```javascript
const WEBHOOK_URL = 'https://query-stream-ai.vercel.app/api/pipelines/webhook/sheet-changed'
```

### Step 4: Set Up Trigger

1. In Apps Script editor, click the clock icon (⏰ Triggers) on the left sidebar
2. Click **+ Add Trigger** (bottom right)
3. Configure:
   - **Choose which function to run**: `onEdit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `From spreadsheet`
   - **Select event type**: `On edit`
4. Click **Save**
5. Authorize the script when prompted

### Step 5: Test the Setup

#### Test 1: Manual Sync

1. In Apps Script editor, select `manualSync` from the function dropdown
2. Click **Run** (▶️)
3. Check the **Execution log** - should see "✅ Sync triggered successfully"

#### Test 2: Edit Trigger

1. Go back to the Google Sheet
2. Make a small edit to any cell in the SEA_CS sheet
3. Wait 30 seconds
4. Check Apps Script logs: **View** → **Executions**
5. Should see `onEdit` and `triggerSync` executions

---

## 🔍 Verification

### Check Sync Status via API

```bash
# Get quarterly sheet status
curl https://your-domain.vercel.app/api/pipelines/quarterly-sheets/0aaba63e-4635-480b-85b0-89fd63267d8a
```

### Manual Sync via API

```bash
# Trigger manual sync
curl -X POST https://your-domain.vercel.app/api/pipelines/quarterly-sheets/0aaba63e-4635-480b-85b0-89fd63267d8a/sync
```

### Check Database

```sql
-- Check last sync time
SELECT
  sheet_name,
  "group",
  sync_status,
  last_sync_at,
  last_sync_status,
  last_sync_error
FROM quarterly_sheets
WHERE "group" = 'cs' AND year = 2025 AND quarter = 4;

-- Check recent pipeline updates
SELECT
  key,
  publisher,
  status,
  updated_at,
  action_detail,
  closed_date
FROM pipelines
WHERE "group" = 'cs'
ORDER BY updated_at DESC
LIMIT 10;
```

---

## 🎯 How Auto-Sync Works

### Workflow

1. **User edits** SEA_CS sheet
2. **onEdit trigger** fires immediately
3. **Debounce timer** starts (30 seconds)
4. If another edit happens, timer resets
5. After 30 seconds of no edits, **triggerSync** fires
6. Apps Script sends webhook to backend
7. Backend validates token and triggers `syncQuarterlySheet()`
8. Sync process:
   - Fetches all data from Google Sheet
   - Compares with database
   - Creates new pipelines
   - Updates existing pipelines
   - Deletes removed pipelines
   - Updates monthly forecasts

### What Gets Synced

**All fields from CS mapping**:
- Basic info: key, classification, poc, team, publisher, domain, etc.
- Action fields: `action_detail`, `action_progress`, `next_action` (CS-specific order)
- Status dates: `interested_date`, `acceptance_date`, `ready_to_deliver_date`, `closed_date`
- Financial: day_gross, day_net_rev, ecpm, revenue_share, etc.
- Quarter summaries: q_gross, q_net_rev
- Monthly forecasts: 15 months × 3 types (end_date, delivery_days, validation_flag)

**NOT synced** (auto-calculated):
- None - everything comes from sheet now (trigger disabled)

---

## 🚨 Troubleshooting

### Sync Not Triggering

1. **Check trigger installed**: Apps Script → Triggers (should see `onEdit`)
2. **Check script authorization**: May need to re-authorize
3. **Check sheet name**: Must be editing `SEA_CS` sheet specifically
4. **Check logs**: Apps Script → Executions

### Webhook Errors

1. **401 Unauthorized**: Wrong token
2. **403 Forbidden**: Spreadsheet ID mismatch
3. **423 Locked**: Sync status is not 'active'
4. **500 Internal**: Check backend logs

### Sync Failing

```sql
-- Check error logs
SELECT last_sync_status, last_sync_error
FROM quarterly_sheets
WHERE sheet_name = 'SEA_CS';
```

---

## 📊 Current Status

### Import Summary

- **Total pipelines imported**: 296 (from 997 rows)
- **Monthly forecasts created**: 4,440
- **Empty rows skipped**: 691
- **Duplicate errors**: 10 (test import rows)

### Database State

```sql
-- Total CS pipelines: 1,108
-- With closed_date: 2
-- With ready_to_deliver_date: 0
-- With action_detail: 1
```

### Quarterly Sheet Registration

- **ID**: `0aaba63e-4635-480b-85b0-89fd63267d8a`
- **Sheet**: SEA_CS
- **Group**: cs
- **Quarter**: Q4 2025
- **Status**: active
- **Last Sync**: 2026-01-07 03:01:53 UTC

---

## ✅ Next Steps

1. ✅ **Import completed** - 296 CS pipelines in database
2. ✅ **Quarterly sheet registered** - Ready for auto-sync
3. ✅ **Webhook token generated** - Authentication ready
4. ⏳ **Add Apps Script** - Follow instructions above
5. ⏳ **Test sync** - Verify auto-sync works
6. ⏳ **Monitor** - Check sync logs and data quality

---

## 🔐 Security Notes

- **Webhook token** is stored securely in database
- **Token authentication** prevents unauthorized sync requests
- **Spreadsheet ID validation** ensures correct sheet
- **RLS policies** control data access by user
- **Service account** has read-only access to Google Sheets

---

## 📚 Related Files

- **Column Mapping**: `scripts/lib/pipeline-column-mapping-cs.cjs`
- **Transformer**: `scripts/lib/sheet-transformers.cjs`
- **Sync Service**: `lib/services/sheetToDatabaseSync.ts`
- **Webhook Handler**: `app/api/pipelines/webhook/sheet-changed/route.ts`
- **Manual Sync API**: `app/api/pipelines/quarterly-sheets/[id]/sync/route.ts`
- **Import Script**: `scripts/import-pipeline-from-sheets.cjs`
