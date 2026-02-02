# Sales Sheet Column Mapping Update

**Date:** 2025-02-02

## Summary

Updated the column mappings for the SEA_Sales Google Sheet to reflect the restructured sheet layout.

## Spreadsheet Details

- **Spreadsheet ID:** `1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM`
- **Sheet Name:** `SEA_Sales`
- **GID:** `1955806688`
- **Note:** Headers are on **row 2** (not row 1), data starts at row 3

## Key Changes

### 1. ZID Moved
- **Old:** Column 34 (AI)
- **New:** Column 9 (J)
- **Impact:** ZID is now in the basic info section

### 2. Region Field Removed
- **Old:** Column 11 (L)
- **New:** Not present in current sheet
- **Impact:** Removed from mapping

### 3. Action Fields Shifted
| Field | Old Column | New Column | Letter |
|-------|-----------|-----------|--------|
| Action Date | 22 | 21 | V |
| Next Action | 24 | 22 | W |
| DETAIL | 25 | 23 | X |
| Action Progress | 26 | 24 | Y |
| Update Target | 27 | 25 | Z |

### 4. Duplicate Action Progress Column
- **Column 26 (AA):** "Action Progress" - **SKIP THIS COLUMN** (duplicate of column 24)

### 5. Timeline Fields (Status & Dates)
| Field | Old Column | New Column | Letter |
|-------|-----------|-----------|--------|
| Starting Date | 28 | 27 | AB |
| Status | 29 | 28 | AC |
| % | 30 | 29 | AD |
| Date of first proposal | 31 | 30 | AE |
| Interested date | 32 | 31 | AF |
| Acceptance date | 33 | 32 | AG |
| 【A】 | N/A | 33 | AH |
| 【Z】 | N/A | 34 | AI |

### 6. c_plus_upgrade Removed
- **Old:** Column 35 (AJ)
- **New:** Not present in current sheet
- **Impact:** All subsequent columns shifted by -1

### 7. Quarterly Summary
| Field | Old Column | New Column | Letter |
|-------|-----------|-----------|--------|
| GR (q_gross) | 36 | 35 | AJ |
| NR (q_net_rev) | 37 | 36 | AK |
| Quarterly breakdown | 38-49 | 37-48 | AM-AX |

### 8. Monthly Data
| Data Type | Old Start | New Start | Range |
|-----------|-----------|-----------|-------|
| End Dates | 50 | 49 | AX-BL |
| Delivery Days | 65 | 64 | BM-CA |
| Validation Flags | 80 | 79 | CB-CO |

## Files Updated

### 1. `scripts/lib/pipeline-column-mapping-sales.cjs`
- Updated COLUMN_MAPPING with new column positions
- Updated MONTHLY_COLUMNS start positions
- Removed SALES_NULL_FIELDS (ready_to_deliver_date, closed_date now exist)
- Added METADATA_FIELDS constant
- Added SKIP_COLUMNS constant

### 2. `lib/services/sheetToDatabaseSync.ts`
- Updated COLUMN_MAPPING_SALES to match the new structure
- Updated MONTHLY_COLUMNS_SALES start positions

## New Column Mapping Reference

```javascript
const COLUMN_MAPPING_SALES = {
  // Basic Info (0-14)
  0: { field: 'key', type: 'string', required: true },
  1: { field: 'classification', type: 'string' },
  2: { field: 'poc', type: 'string', required: true },
  3: { field: 'team', type: 'string' },
  4: { field: 'ma_mi', type: 'string' },                    // E: MA/MI
  5: { field: 'pid', type: 'string' },                      // F: PID
  6: { field: 'publisher', type: 'string', required: true },
  7: { field: 'mid', type: 'string' },
  8: { field: 'domain', type: 'string' },
  9: { field: 'zid', type: 'string' },                      // J: ZID (moved!)
  10: { field: 'channel', type: 'string' },
  11: { field: 'competitors', type: 'string' },
  // Column 12: Pipeline Quarter (metadata)
  13: { field: 'description', type: 'string' },
  14: { field: 'product', type: 'string' },

  // Daily Metrics (15-20)
  15: { field: 'day_gross', type: 'decimal' },
  16: { field: 'day_net_rev', type: 'decimal' },
  17: { field: 'imp', type: 'bigint' },
  18: { field: 'ecpm', type: 'decimal' },
  19: { field: 'max_gross', type: 'decimal' },
  20: { field: 'revenue_share', type: 'decimal' },
  // Column 21: Action Date (metadata)

  // Action Fields (22-24)
  22: { field: 'next_action', type: 'string' },
  23: { field: 'action_detail', type: 'string' },
  24: { field: 'action_progress', type: 'string' },
  // Column 25: Update Target (metadata)
  // Column 26: SKIP (duplicate Action Progress)

  // Timeline (27-34)
  27: { field: 'starting_date', type: 'date' },
  28: { field: 'status', type: 'string', default: '【E】' },
  29: { field: 'progress_percent', type: 'integer' },
  30: { field: 'proposal_date', type: 'date' },
  31: { field: 'interested_date', type: 'date' },
  32: { field: 'acceptance_date', type: 'date' },
  33: { field: 'ready_to_deliver_date', type: 'date' },
  34: { field: 'closed_date', type: 'date' },

  // Quarterly (35-48)
  35: { field: 'q_gross', type: 'decimal' },
  36: { field: 'q_net_rev', type: 'decimal' },
}

const MONTHLY_COLUMNS_SALES = {
  endDates: { start: 49, count: 15, field: 'end_date' },
  deliveryDays: { start: 64, count: 15, field: 'delivery_days' },
  validation: { start: 79, count: 15, field: 'validation_flag' }
}
```

## Verification

Run the verification script to confirm the mappings are correct:

```bash
node scripts/verify-sales-column-mapping.mjs
```

Expected output:
- ✓ All key columns match expected positions
- ✓ Column 26 identified as duplicate (Action Progress)
- ✓ Data correctly extracted from sample rows

## Metadata Fields

These fields are stored in the `metadata` JSONB column (not as direct columns):
- Column 4: `ma_mi` (also mapped directly)
- Column 12: `pipeline_quarter`
- Column 21: `action_date`
- Column 25: `update_target`

## Testing Recommendations

1. Test sync with a few pipelines first
2. Verify ZID is correctly read from column 9
3. Verify action fields are correctly read from columns 22-24
4. Verify status dates are correctly read from columns 27-34
5. Verify quarterly data is correctly read from columns 35-36
6. Verify monthly data starts at columns 49, 64, 79
