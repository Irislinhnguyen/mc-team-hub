# Tag Creation Tool V2 - Implementation Plan

## Overview
CSV-based zone extraction for the ad system workflow, replacing screenshot-based extraction.

## Motivation
- **Eliminate manual transcription:** No more copying zoneId/zoneName/mediaName from screenshots
- **100% accuracy:** CSV data is exact, no AI Vision errors
- **Faster workflow:** Upload CSV → Auto-extract → Sync (vs screenshot → manual entry)
- **Bonus:** Auto-fill publisherId from CSV (currently manual input)

## Workflow Comparison

### V1 (Current - Screenshot)
```
Step 0: Generate Excel (with zone names)
Step 1: Upload to ad system
Step 2: Screenshot the zone table
Step 3: Upload screenshot → AI extracts zoneId, zoneName, mediaName
Step 4: Key in PID, Pub Name manually
Step 5: Fill in extra info (Zone Type, CS/Sales Note, Account)
Step 6: Sync to Google Sheets
```

### V2 (New - CSV Upload - No Screenshot)
```
Step 0: Generate Excel (with zone names)
Step 1: Upload to ad system
Step 2: Download zoneInfo.csv from ad system → Upload CSV
         (Auto-extracts: zoneId, zoneName, mediaId, mediaName, publisherId)
Step 3: Fill in extra info (Zone Type, CS/Sales Note, Account)
         PID auto-filled from CSV if available, else from Step 0
Step 4: Sync to Google Sheets
```

**Key Changes:**
- ❌ NO screenshot step
- ✅ CSV upload replaces screenshot entirely
- ✅ PID auto-filled from CSV's publisherId column

## Files to Create/Modify

### 1. NEW Service Layer
**File:** `lib/services/tools/csvZoneParserService.ts`

```typescript
// Parse CSV buffer and return ExtractedZone[]
export async function parseCSV(buffer: Buffer): Promise<ExtractedZone[]>

// Validate CSV has required columns
export function validateCSV(headers: string[]): ValidationResult

// Map CSV row to ExtractedZone interface
export function mapCSVRowToZone(row: CSVRow): ExtractedZone
```

### 2. NEW API Route
**File:** `apps/web/app/api/tools/tag-creation/parse-csv/route.ts`

```
POST /api/tools/tag-creation/parse-csv
Body: FormData with 'csv' file
Response: { status: 'success', zones: ExtractedZone[], publisherId: string, count: number }
```

### 3. MODIFY Component
**File:** `apps/web/components/tools/tag-creation/CsvPreviewStep.tsx`

Change from "Upload CSV + Take Screenshot" to:
- Instruction: Upload to ad system, then download zoneInfo.csv
- CSV file upload (drag & drop)
- Validation feedback

### 4. MODIFY Component
**File:** `apps/web/components/tools/tag-creation/ZoneDataEntryStep.tsx`

Add auto-fill logic for CSV data:
- Receive zones from CSV (already has zoneId, zoneName)
- Auto-fill PID from CSV's publisherId (override Step 0 if CSV has it)
- Keep existing Zone Type, CS/Sales Note, Account fields

### 5. MODIFY Page Flow
**File:** `apps/web/app/(protected)/tools/tag-creation/app/page.tsx` (and web/page.tsx)

Update step flow to use CSV instead of screenshot

## Data Flow & Mapping

### Step 0 Data → Passed Through
```
Step 0 Input:
- MID (media ID)
- PID (publisher ID)
- PubName (publisher name)
- Site URL / App URL
- Child Network Code
- PIC

→ Passed to Step 3 as common fields
```

### CSV → ExtractedZone + Auto-fill
```
CSV Upload (Step 2):
  zoneId, zoneName, mediaId, mediaName, publisherId
         ↓
  Parse & Map to ExtractedZone:
  - zoneId → zone_id
  - zoneName → zone_name
  - publisherId → Auto-fills PID in Step 3 (overrides Step 0!)
  - mediaId, mediaName → For display/reference
         ↓
  Step 3 receives:
  - zones[] with zone_id, zone_name pre-filled
  - PID pre-filled from CSV (if available)
  - Other common fields from Step 0
```

### Data Mapping Table

| CSV Column | ExtractedZone Field | Step 3 Use | Notes |
|------------|---------------------|------------|-------|
| zoneId | zone_id | Display | Shown in zone table |
| zoneName | zone_name | Display | Shown in zone table |
| mediaId | (derived) | MID input | Reference for Step 3 |
| mediaName | (derived) | Media Name input | Reference for Step 3 |
| publisherId | (NOT in ExtractedZone) | **PID AUTO-FILL** | Overrides Step 0 PID! |

**Important:** `publisherId` from CSV auto-fills the PID input field in Step 3, overriding any PID from Step 0. This is correct because CSV is the source of truth after zones are created.

## Implementation Summary

### What Changes (V1 → V2)

| Component | V1 (Screenshot) | V2 (CSV) |
|-----------|-----------------|----------|
| **CsvPreviewStep** | "Upload CSV, take screenshot" | "Upload CSV to platform, download CSV, upload here" |
| **ZoneExtractionStep** | Upload screenshot → AI Vision | ❌ REMOVED (not needed) |
| **ZoneDataEntryStep** | Manual PID input | PID auto-filled from CSV `publisherId` |
| **API** | `/extract-zones` (screenshot) | `/parse-csv` (CSV file) |
| **Service** | `zoneExtractionService` | NEW: `csvZoneParserService` |

### Key User Flow Changes

**Before (V1):**
1. Generate Excel → Upload to ad system
2. **Take screenshot** of zone table
3. Upload screenshot → AI extracts zoneId, zoneName
4. Key in PID, PubName, MID, Media Name manually
5. Fill Zone Type, CS/Sales Note per zone
6. Sync to Sheets

**After (V2):**
1. Generate Excel → Upload to ad system
2. **Download CSV** from ad system → **Upload CSV**
3. CSV auto-extracts: zoneId, zoneName, **publisherId** (auto-fills PID!)
4. Verify/Edit PubName, MID, Media Name (from Step 0)
5. Fill Zone Type, CS/Sales Note per zone
6. Sync to Sheets

### What Gets Auto-filled

| Field | Source | Can Override? |
|-------|--------|---------------|
| zoneId | CSV zoneId column | ✅ Yes (editable in Step 3) |
| zoneName | CSV zoneName column | ✅ Yes (editable in Step 3) |
| PID | **CSV publisherId** (primary) → Step 0 (fallback) | ✅ Yes (always editable) |
| PubName | Step 0 | ✅ Yes (always editable) |
| MID | Step 0 | ✅ Yes (always editable) |
| Media Name | Step 0 | ✅ Yes (always editable) |
| Zone Type | Auto-detected from zone name | ✅ Yes (dropdown) |
| CS/Sales Note | Auto-filled (PR, FP) | ✅ Yes (textarea) |

## Validation Rules

### Required CSV Columns
```typescript
const REQUIRED_COLUMNS = [
  'zoneId',
  'zoneName',
  'mediaId',
  'mediaName',
  'publisherId'
] as const
```

### Zone Validation
- `zoneId`: Must be numeric string
- `zoneName`: Must not be empty
- `mediaId`: Must be numeric string
- `publisherId`: Must be numeric string (for PID auto-fill)

## API Response Format

### POST /api/tools/tag-creation/parse-csv

**Request:**
```typescript
FormData {
  csv: File  // zoneInfo.csv from ad system
}
```

**Success Response:**
```typescript
{
  status: 'success',
  zones: ExtractedZone[],  // Array with zone_id, zone_name pre-filled
  publisherId: string,     // Extracted from CSV for PID auto-fill
  mediaId: string,          // First row's mediaId
  mediaName: string,        // First row's mediaName
  count: number             // Number of zones extracted
}
```

**Error Response:**
```typescript
{
  status: 'error',
  error: 'Missing required columns: zoneId, publisherId',
  validationErrors: string[]
}
```

## Error Handling

### Required CSV Columns
```typescript
const REQUIRED_COLUMNS = [
  'zoneId',
  'zoneName',
  'mediaId',
  'mediaName',
  'publisherId'
] as const
```

### Zone Validation
- `zoneId`: Must be numeric string
- `zoneName`: Must not be empty
- `mediaId`: Must be numeric string
- `publisherId`: Must be numeric string

## Error Handling

### User-Facing Errors
| Error | Message | Action |
|-------|---------|--------|
| No file uploaded | "Please select a CSV file to upload" | Show upload prompt |
| Invalid file type | "Only CSV files are supported" | Suggest correct format |
| Missing columns | "CSV is missing columns: zoneId, mediaName" | List missing columns |
| Empty CSV | "No zones found in CSV file" | Suggest verify file |
| Encoding error | "Could not read CSV file. Please ensure it's UTF-8 encoded." | Technical details |

### System Errors
| Error | Handling |
|-------|----------|
| Parse error | Return 400 with error details |
| Large file | Return 413 (max 1MB) |
| Invalid encoding | Fallback to Latin-1 |

## Testing

### Unit Tests
```bash
lib/services/tools/csvZoneParserService.test.ts
```

### Integration Tests
```bash
apps/web/app/api/tools/tag-creation-v2/parse-csv.test.ts
```

### E2E Tests
```bash
tests/e2e/tag-creation-v2-e2e.spec.ts
```

## Deployment

1. Create feature branch: `feature/tag-creation-v2`
2. Implement all 5 files
3. Add tests
4. Deploy to staging for testing
5. User acceptance testing with real CSV files
6. Merge to main
7. Monitor for issues

## Rollback Plan

If V2 has issues:
- V1 remains available at `/tools/tag-creation`
- Users can fall back to screenshot workflow
- No breaking changes to existing functionality

## Success Metrics

- **Accuracy:** 100% (CSV is exact data)
- **Time savings:** ~50% faster than V1 (no manual transcription)
- **Error reduction:** 0 transcription errors
- **User satisfaction:** Qualitative feedback after 1 week

## Future Enhancements (Out of Scope)

- Bulk CSV upload (multiple files)
- CSV template generation
- Historical zone tracking
- Delta detection (only sync new zones)
- CSV export from our system
