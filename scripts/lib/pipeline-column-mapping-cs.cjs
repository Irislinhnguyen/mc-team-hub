/**
 * Column Mapping Configuration for SEA_CS Google Sheet
 *
 * DIFFERENT from Sales sheet in columns 9, 23-25, and 33-34
 *
 * Spreadsheet ID: 1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM
 * Sheet: SEA_CS
 *
 * Key Differences from Sales:
 * - Column 9 (J): ZID (Sales has Product here)
 * - Column 10 (K): Channel (Sales has Channel here too)
 * - NO Region column (Sales has Region at column 11)
 * - Action fields (23-25): Different order
 * - Status dates (33-34): AH=ready_to_deliver_date, AI=closed_date (NOT zid/c_plus_upgrade)
 */

/**
 * Main column mapping from Google Sheets to database
 * Column indices are 0-based (Column A = 0, B = 1, etc.)
 */
const COLUMN_MAPPING = {
  // ============================================
  // Basic Info (0-22) - DIFFERENT from Sales at column 9!
  // ============================================
  0: { field: 'key', type: 'string', required: true },           // A: key
  1: { field: 'classification', type: 'string' },                // B: Classification
  2: { field: 'poc', type: 'string', required: true },           // C: PIC
  3: { field: 'team', type: 'string' },                          // D: Team
  // Column 4 (E: MA/MI) - stored in metadata
  5: { field: 'pid', type: 'string' },                           // F: PID
  6: { field: 'publisher', type: 'string', required: true },     // G: Publisher
  7: { field: 'mid', type: 'string' },                           // H: MID/siteID
  8: { field: 'domain', type: 'string' },                        // I: domain
  9: { field: 'zid', type: 'string' },                           // J: ZID (CS-specific!)
  10: { field: 'channel', type: 'string' },                      // K: Channel
  11: { field: 'competitors', type: 'string' },                  // L: Competitors
  // NOTE: CS sheet does NOT have Region field (unlike Sales)
  // Column 12 (M: Pipeline Quarter) - stored in metadata
  13: { field: 'description', type: 'string' },                  // N: Pipeline detail
  14: { field: 'product', type: 'string' },                      // O: Product

  // Revenue Metrics
  15: { field: 'day_gross', type: 'decimal' },                   // P: day gross
  16: { field: 'day_net_rev', type: 'decimal' },                 // Q: day net rev
  17: { field: 'imp', type: 'bigint' },                          // R: IMP (30days)
  18: { field: 'ecpm', type: 'decimal' },                        // S: eCPM
  19: { field: 'max_gross', type: 'decimal' },                   // T: Max Gross
  20: { field: 'revenue_share', type: 'decimal' },               // U: R/S
  // Column 21 (V: logic of Estimation) - stored in metadata
  22: { field: 'action_date', type: 'date' },                    // W: Action Date

  // ============================================
  // ⚠️ CS-SPECIFIC: Action Fields (23-25)
  // DIFFERENT ORDER from Sales!
  // ============================================
  23: { field: 'action_detail', type: 'string' },                // X: DETAIL
  24: { field: 'action_progress', type: 'string' },              // Y: Action Progress
  25: { field: 'next_action', type: 'string' },                  // Z: Next Action

  // Column 26 (AA: Update Target) - stored in metadata

  // ============================================
  // Status & Timeline (27-32) - SAME AS SALES
  // ============================================
  27: { field: 'starting_date', type: 'date' },                  // AB: Starting Date
  28: { field: 'status', type: 'string', default: '【E】' },     // AC: Status
  29: { field: 'progress_percent', type: 'integer' },            // AD: %
  30: { field: 'proposal_date', type: 'date' },                  // AE: Date of first proposal
  31: { field: 'interested_date', type: 'date' },                // AF: Interested date (C/C-)
  32: { field: 'acceptance_date', type: 'date' },                // AG: Acceptance date (B)

  // ============================================
  // ⚠️ CS-SPECIFIC: Status Transition Dates (33-34)
  // COMPLETELY DIFFERENT from Sales!
  // ============================================
  33: { field: 'ready_to_deliver_date', type: 'date' },          // AH: 【S-】/【A】 (A status)
  34: { field: 'closed_date', type: 'date' },                    // AI: 【Z】 (Z status)

  // ============================================
  // Quarter Summary (35-36) - SAME AS SALES
  // ============================================
  35: { field: 'q_gross', type: 'decimal' },                     // AJ: GR (Q粗利)
  36: { field: 'q_net_rev', type: 'decimal' },                   // AK: NR (Q純収益)
}

/**
 * Monthly forecast columns configuration
 * 15 months of data (current fiscal year + 3 months)
 * SAME AS SALES
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

  // Validation flags: Columns CB-CP (79-93)
  validation: {
    start: 79,
    count: 15,
    field: 'validation_flag'
  }
}

/**
 * Valid status values
 * SAME AS SALES
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
 * SAME AS SALES
 */
const DEFAULT_VALUES = {
  status: '【E】',
  progress_percent: 0,
  forecast_type: 'estimate',
  metadata: {}
}

module.exports = {
  COLUMN_MAPPING,
  MONTHLY_COLUMNS,
  VALID_STATUSES,
  DEFAULT_VALUES
}
