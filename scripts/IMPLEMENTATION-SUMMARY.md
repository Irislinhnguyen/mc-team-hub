# Google Sheets Row Count Discrepancy Fix - Implementation Summary

## Overview

This implementation fixes the row count discrepancy between Google Sheets and the database by adding delete capability to the sync service.

## Problem Summary

- **CS Sheet**: 506 in system vs 487 actual rows = **19 orphan records**
- **Sales Sheet**: 248 in system vs 248 actual rows = ✓ matches

The sync service was using UPSERT-only mode (CREATE + UPDATE, no DELETE), causing deleted rows to remain in the database as "orphan" records.

## Implementation Details

### Phase 1: Webhook Investigation

**Diagnostic Script**: `scripts/diagnose-webhook.mjs`

Run with: `node scripts/diagnose-webhook.mjs`

**Findings**:
- Webhook has **NEVER been triggered**
- Google Apps Script trigger needs to be set up
- Both sheets (CS and Sales) are active and configured

**Next Steps for Webhook**:
1. Open the Google Sheet
2. Go to Extensions → Apps Script
3. Set up an onEdit(e) or onChange(e) trigger
4. Configure webhook URL and payload format

### Phase 2: Delete Capability Implementation

#### Files Modified

1. **`lib/services/sheetToDatabaseSync.ts`**
   - Added `enableDelete` parameter to `syncQuarterlySheet()` function
   - Added orphan detection logic:
     - Fetches all sheet rows and extracts `sheet_row_number` values
     - Queries database for all pipelines in the quarterly sheet
     - Identifies orphans (DB records not in sheet)
     - Deletes orphans before UPSERT
   - Returns `deleted` count in sync result

2. **`app/api/pipelines/quarterly-sheets/[id]/sync/route.ts`**
   - Added `?delete=true` query param support
   - Passes `enableDelete` to sync function

3. **`app/api/pipelines/webhook/sheet-changed/route.ts`**
   - **Webhook always enables delete mode** to keep database in sync with sheet

### Usage

#### Manual Sync with Delete (Cleanup)

**Option 1: Using the cleanup script (Recommended)**
```bash
# Make sure Next.js dev server is running first
npm run dev

# In another terminal, run:
node scripts/cleanup-cs-sheet.mjs
```

**Option 2: Using the API endpoint directly**
```bash
# Find the quarterly sheet ID first (from database or UI)
# Then call the API with ?delete=true parameter

curl -X POST "http://localhost:3000/api/pipelines/quarterly-sheets/{SHEET_ID}/sync?delete=true"
```

#### Future Syncs

Once the cleanup is complete:
- **Webhook syncs** will automatically delete orphans (enabled by default)
- **Manual syncs** require `?delete=true` parameter to delete orphans

## Verification Steps

1. **Run the cleanup script** for CS sheet
2. **Verify count drops** from 506 → 487 (19 orphans removed)
3. **Verify Sales count** remains at 248 (no orphans)
4. **Test delete functionality**:
   - Delete a row from Google Sheet
   - Run sync with `?delete=true`
   - Verify the row is removed from database

## Scripts Created

1. **`scripts/diagnose-webhook.mjs`** - Webhook diagnostic tool
2. **`scripts/cleanup-cs-sheet.mjs`** - Cleanup script for CS sheet

## Important Notes

- **Webhook auto-delete**: Webhook syncs always enable delete mode to keep DB in sync
- **Manual sync delete**: Requires explicit `?delete=true` parameter
- **Data safety**: Always test with a small batch before running cleanup on production

## Post-Implementation Checklist

- [ ] Set up Google Apps Script trigger on CS sheet
- [ ] Set up Google Apps Script trigger on Sales sheet
- [ ] Run cleanup script for CS sheet
- [ ] Verify counts match after cleanup
- [ ] Test webhook by making a manual edit
- [ ] Verify webhook deletes removed rows automatically

## Technical Changes

### syncQuarterlySheet() Signature Change

**Before**:
```typescript
export async function syncQuarterlySheet(
  quarterlySheetId: string,
  userId?: string,
  userEmail?: string,
  changedRows?: number[]
): Promise<SyncResult>
```

**After**:
```typescript
export async function syncQuarterlySheet(
  quarterlySheetId: string,
  userId?: string,
  userEmail?: string,
  changedRows?: number[],
  enableDelete?: boolean = false
): Promise<SyncResult>
```

### SyncResult Fields

Now includes `deleted` count:
```typescript
{
  success: boolean
  total: number
  created: number
  updated: number
  deleted: number  // ← NEW: Number of orphan records deleted
  errors: string[]
  duration_ms: number
}
```
