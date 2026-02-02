/**
 * Column Mapping Configuration for SEA_Sales Google Sheet
 *
 * Updated: 2025-02-02 - Major column restructure
 *
 * Spreadsheet ID: 1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM
 * Sheet: SEA_Sales
 *
 * Current Structure (2025-02-02):
 * - ZID moved to column 9 (J) - was at column 34
 * - Region field removed (was at column 11)
 * - MA/MI at column 4 (E), PID at 5 (F), Publisher at 6 (G)
 * - Product at column 14 (O)
 * - Action fields at columns 22-24 (skip 26 - duplicate Action Progress)
 * - Timeline fields at columns 27-34 (ready_to_deliver_date, closed_date now included)
 * - c_plus_upgrade removed (was at column 35)
 * - Quarterly columns at 35-48
 * - Monthly data starts at 49, 64, 79
 */

/**
 * Main column mapping from Google Sheets to database
 * Column indices are 0-based (Column A = 0, B = 1, etc.)
 */
const COLUMN_MAPPING = {
  // ============================================
  // Basic Info (0-14)
  // ============================================
  0: { field: 'key', type: 'string', required: true },           // A: key
  1: { field: 'classification', type: 'string' },                // B: Classification
  2: { field: 'poc', type: 'string', required: true },           // C: AM (Account Manager)
  3: { field: 'team', type: 'string' },                          // D: Team
  4: { field: 'ma_mi', type: 'string' },                         // E: MA/MI
  5: { field: 'pid', type: 'string' },                           // F: PID
  6: { field: 'publisher', type: 'string', required: true },     // G: Publisher
  7: { field: 'mid', type: 'string' },                           // H: MID/siteID
  8: { field: 'domain', type: 'string' },                        // I: domain
  9: { field: 'zid', type: 'string' },                           // J: ZID (moved from col 34!)
  10: { field: 'channel', type: 'string' },                      // K: Channel
  11: { field: 'competitors', type: 'string' },                  // L: Competitors
  // Column 12 (M: Pipeline Quarter) - stored in metadata
  13: { field: 'description', type: 'string' },                  // N: Pipeline detail
  14: { field: 'product', type: 'string' },                      // O: Product

  // ============================================
  // Daily Metrics (15-20)
  // ============================================
  15: { field: 'day_gross', type: 'decimal' },                   // P: day gross
  16: { field: 'day_net_rev', type: 'decimal' },                 // Q: day net rev
  17: { field: 'imp', type: 'bigint' },                          // R: IMP (30days)
  18: { field: 'ecpm', type: 'decimal' },                        // S: eCPM
  19: { field: 'max_gross', type: 'decimal' },                   // T: Max Gross
  20: { field: 'revenue_share', type: 'decimal' },               // U: R/S
  // Column 21 (V: Action Date) - stored in metadata

  // ============================================
  // Action Fields (22-24) - skip column 26 (duplicate)
  // ============================================
  22: { field: 'next_action', type: 'string' },                  // W: Next Action
  23: { field: 'action_detail', type: 'string' },                // X: DETAIL
  24: { field: 'action_progress', type: 'string' },              // Y: Action Progress
  // Column 25 (Z: Update Target) - stored in metadata
  // Column 26 (AA: Action Progress) - DUPLICATE, SKIP

  // ============================================
  // Timeline (27-34)
  // ============================================
  27: { field: 'starting_date', type: 'date' },                  // AB: Starting Date
  28: { field: 'status', type: 'string', default: '【E】' },     // AC: Status
  29: { field: 'progress_percent', type: 'integer' },            // AD: %
  30: { field: 'proposal_date', type: 'date' },                  // AE: Date of first proposal
  31: { field: 'interested_date', type: 'date' },                // AF: Interested date
  32: { field: 'acceptance_date', type: 'date' },                // AG: Acceptance date
  33: { field: 'ready_to_deliver_date', type: 'date' },          // AH: 【A】
  34: { field: 'closed_date', type: 'date' },                    // AI: 【Z】

  // ============================================
  // Quarterly Summary (35-48) - c_plus_upgrade removed
  // ============================================
  35: { field: 'q_gross', type: 'decimal' },                     // AJ: GR
  36: { field: 'q_net_rev', type: 'decimal' },                   // AK: NR
  // Columns 37-48: Quarterly breakdown (not mapped to DB fields)
}

/**
 * Monthly forecast columns configuration
 * 15 months of data (current fiscal year + 3 months)
 * SAME AS CS (assumed - verify if different)
 */
const MONTHLY_COLUMNS = {
  // End dates: Columns AX-BL (49-63)
  endDates: {
    start: 49,
    count: 15,
    field: 'end_date'
  },

  // Delivery days: Columns BM-CA (64-78)
  deliveryDays: {
    start: 64,
    count: 15,
    field: 'delivery_days'
  },

  // Validation flags: Columns CB-CO (79-93)
  validation: {
    start: 79,
    count: 15,
    field: 'validation_flag'
  }
}

/**
 * Valid status values
 * SAME AS CS
 */
const VALID_STATUSES = [
  '【S】',   // Top tier - Repeat reflected
  '【S-】',  // Distribution started
  '【A】',   // Tags sent / Ready to deliver
  '【B】',   // Agreement obtained
  '【C+】',  // Client shows strong interest
  '【C】',   // Client shows interest
  '【C-】',  // Client shows weak interest
  '【D】',   // Prospecting
  '【E】',   // Initial/Exploring
  '【Z】'    // Closed/Ended
]

/**
 * Default values for new pipelines
 * SAME AS CS
 */
const DEFAULT_VALUES = {
  status: '【E】',
  progress_percent: 0,
  forecast_type: 'estimate',
  metadata: {}
}

/**
 * Metadata fields that are stored in the metadata JSONB column
 * instead of as direct database columns
 */
const METADATA_FIELDS = [
  'ma_mi',              // Column 4 (E)
  'pipeline_quarter',   // Column 12 (M)
  'action_date',        // Column 21 (V)
  'update_target'       // Column 25 (Z)
]

/**
 * Fields to skip (not mapped to database)
 */
const SKIP_COLUMNS = [
  26  // Column AA: Duplicate "Action Progress" - skip this
]

module.exports = {
  COLUMN_MAPPING,
  MONTHLY_COLUMNS,
  VALID_STATUSES,
  DEFAULT_VALUES,
  METADATA_FIELDS,
  SKIP_COLUMNS
}
