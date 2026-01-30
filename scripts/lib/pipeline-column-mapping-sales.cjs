/**
 * Column Mapping Configuration for SEA_Sales Google Sheet
 *
 * DIFFERENT from CS sheet in columns 4-6, 9-14, 23-26, and 34-35
 *
 * Spreadsheet ID: 1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM
 * Sheet: SEA_Sales
 *
 * Key Differences from CS:
 * - Columns 4-6: PID at E (not metadata), Publisher at F, MA/MI at G (not F)
 * - Columns 9-12: Product (J), Channel (K), Region (L), Competitors (M) - different from CS
 * - Column 13-14: Pipeline Quarter at N (metadata), Pipeline detail at O
 * - Column 15: Duplicate "Product" header - SKIP THIS COLUMN
 * - Revenue columns start at 16 (Q), not 15 (P)
 * - Action fields (24-26): Different order from CS
 * - ZID at column 34 (AI), not column 9 like CS
 * - Status dates (34-35): zid, c_plus_upgrade (NOT ready_to_deliver_date, closed_date)
 * - ready_to_deliver_date and closed_date are NULL for Sales (not in sheet)
 */

/**
 * Main column mapping from Google Sheets to database
 * Column indices are 0-based (Column A = 0, B = 1, etc.)
 */
const COLUMN_MAPPING = {
  // ============================================
  // Basic Info (0-14) - DIFFERENT from CS!
  // ============================================
  0: { field: 'key', type: 'string', required: true },           // A: key
  1: { field: 'classification', type: 'string' },                // B: Classification
  2: { field: 'poc', type: 'string', required: true },           // C: AM (Account Manager)
  3: { field: 'team', type: 'string' },                          // D: Team
  4: { field: 'pid', type: 'string' },                           // E: PID (Sales-specific!)
  5: { field: 'publisher', type: 'string', required: true },     // F: Publisher
  // Column 6 (G: MA/MI) - stored in metadata
  7: { field: 'mid', type: 'string' },                           // H: MID/siteID
  8: { field: 'domain', type: 'string' },                        // I: domain
  9: { field: 'product', type: 'string' },                       // J: Product (Sales-specific!)
  10: { field: 'channel', type: 'string' },                      // K: Channel
  11: { field: 'region', type: 'string' },                       // L: Region
  12: { field: 'competitors', type: 'string' },                  // M: Competitors
  // Column 13 (N: Pipeline Quarter) - stored in metadata
  14: { field: 'description', type: 'string' },                  // O: Pipeline detail
  // Column 15 (P): Duplicate "Product" header - SKIP

  // Revenue Metrics - Start at column 16 (Q) due to skipped column 15
  16: { field: 'day_gross', type: 'decimal' },                   // Q: day gross
  17: { field: 'day_net_rev', type: 'decimal' },                 // R: day net rev
  18: { field: 'imp', type: 'bigint' },                          // S: IMP (30days)
  19: { field: 'ecpm', type: 'decimal' },                        // T: eCPM
  20: { field: 'max_gross', type: 'decimal' },                   // U: Max Gross
  21: { field: 'revenue_share', type: 'decimal' },               // V: R/S
  // Column 22 (W: logic of Estimation) - stored in metadata
  23: { field: 'action_date', type: 'date' },                    // X: Action Date

  // ============================================
  // ⚠️ SALES-SPECIFIC: Action Fields (24-26)
  // DIFFERENT ORDER from CS!
  // ============================================
  24: { field: 'next_action', type: 'string' },                  // Y: Next Action
  25: { field: 'action_detail', type: 'string' },                // Z: DETAIL
  26: { field: 'action_progress', type: 'string' },              // AA: Action Progress
  // Column 27 (AB: Update Target) - stored in metadata

  // ============================================
  // Status & Timeline (28-33) - Shifted by 1 from original
  // ============================================
  28: { field: 'starting_date', type: 'date' },                  // AC: Starting Date
  29: { field: 'status', type: 'string', default: '【E】' },     // AD: Status
  30: { field: 'progress_percent', type: 'integer' },            // AE: %
  31: { field: 'proposal_date', type: 'date' },                  // AF: Date of first proposal
  32: { field: 'interested_date', type: 'date' },                // AG: Interested date (C/C-)
  33: { field: 'acceptance_date', type: 'date' },                // AH: Acceptance date (B)

  // ============================================
  // ⚠️ SALES-SPECIFIC: ZID and C+↑ (34-35)
  // COMPLETELY DIFFERENT from CS!
  // ready_to_deliver_date and closed_date are NOT in Sales sheet
  // ============================================
  34: { field: 'zid', type: 'string' },                          // AI: ZID
  35: { field: 'c_plus_upgrade', type: 'string' },               // AJ: C+↑

  // ============================================
  // Quarter Summary (36-37) - Now enabled!
  // ============================================
  36: { field: 'q_gross', type: 'decimal' },                     // AK: GR (Q粗利)
  37: { field: 'q_net_rev', type: 'decimal' },                   // AL: NR (Q純収益)
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

  // Validation flags: Columns CB-CP (79-93)
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
 * Fields that exist in CS but NOT in Sales sheet
 * These will be set to NULL for Sales pipelines
 */
const SALES_NULL_FIELDS = [
  'ready_to_deliver_date',  // CS column AH (33) - Sales has ZID instead
  'closed_date'             // CS column AI (34) - Sales has C+↑ instead
]

module.exports = {
  COLUMN_MAPPING,
  MONTHLY_COLUMNS,
  VALID_STATUSES,
  DEFAULT_VALUES,
  SALES_NULL_FIELDS
}
