/**
 * Column Mapping Configuration for Google Sheets Pipeline Import
 *
 * Maps Google Sheets columns (0-indexed) to database fields
 * Based on analysis of SEA_Sales and SEA_CS sheets
 */

/**
 * Main column mapping from Google Sheets to database
 * Column indices are 0-based (Column A = 0, B = 1, etc.)
 *
 * NOTE: Both Import and Sync sheets have same column positions (B onwards)
 * Import sheet: Column A = "key" (ignored during import)
 * Sync sheet: Column A = Pipeline ID (UUID)
 */
const COLUMN_MAPPING = {
  // Basic Info - Import sheet has "key" at A, no Pipeline ID
  // Column A (0): key - ignored
  // Column B onwards:
  1: { field: 'classification', type: 'string' },       // B: Classification
  2: { field: 'poc', type: 'string', required: true },  // C: POC
  3: { field: 'team', type: 'string' },                 // D: Team
  4: { field: 'pid', type: 'string' },                  // E: PID
  5: { field: 'publisher', type: 'string', required: true }, // F: Publisher
  7: { field: 'mid', type: 'string' },                  // H: MID/siteID
  8: { field: 'domain', type: 'string' },               // I: Domain
  9: { field: 'channel', type: 'string' },              // J: Channel
  10: { field: 'region', type: 'string' },              // K: Region
  11: { field: 'competitors', type: 'string' },         // L: Competitors
  13: { field: 'description', type: 'string' },         // N: Pipeline detail
  14: { field: 'product', type: 'string' },             // O: Product

  // Revenue Metrics
  15: { field: 'day_gross', type: 'decimal' },          // P: day gross
  16: { field: 'day_net_rev', type: 'decimal' },        // Q: day net rev
  17: { field: 'imp', type: 'bigint' },                 // R: IMP (30days)
  18: { field: 'ecpm', type: 'decimal' },               // S: eCPM
  19: { field: 'max_gross', type: 'decimal' },          // T: Max Gross
  20: { field: 'revenue_share', type: 'decimal' },      // U: R/S

  // Action Tracking
  22: { field: 'action_date', type: 'date' },           // W: Action Date
  23: { field: 'next_action', type: 'string' },         // X: Next Action
  24: { field: 'action_detail', type: 'string' },       // Y: DETAIL
  25: { field: 'action_progress', type: 'string' },     // Z: Action Progress

  // Status & Timeline
  27: { field: 'starting_date', type: 'date' },         // AB: Starting Date
  28: { field: 'status', type: 'string', default: '【E】' },      // AC: Status
  29: { field: 'progress_percent', type: 'integer' },   // AD: %
  30: { field: 'proposal_date', type: 'date' },         // AE: Date of first proposal
  31: { field: 'interested_date', type: 'date' },       // AF: Interested date
  32: { field: 'acceptance_date', type: 'date' },       // AG: Acceptance date

  // Quarter Summary
  35: { field: 'q_gross', type: 'decimal' },            // AJ: GR (Q粗利)
  36: { field: 'q_net_rev', type: 'decimal' },          // AK: NR (Q純収益)
}

/**
 * Monthly forecast columns configuration
 * These columns repeat for each month (15 months total)
 *
 * NOTE: Same positions for both Import and Sync sheets
 */
const MONTHLY_COLUMNS = {
  // End dates: Columns AX-BL (49-63 in 0-indexed)
  // 1月末日, 2月末日, ..., 3月末日 2026
  endDates: {
    start: 49,
    count: 15,
    field: 'end_date'
  },

  // Delivery days: Columns BM-CA (64-78 in 0-indexed)
  // 1月配信日数, 2月配信日数, ...
  deliveryDays: {
    start: 64,
    count: 15,
    field: 'delivery_days'
  },

  // Validation flags: Columns CB-CP (79-93 in 0-indexed)
  // 1月判定, 2月判定, ...
  validation: {
    start: 79,
    count: 15,
    field: 'validation_flag'
  }
}

/**
 * Valid status values
 */
const VALID_STATUSES = [
  '【S】',   // Top tier
  '【S-】',
  '【A】',
  '【B】',
  '【C+】',
  '【C】',
  '【C-】',
  '【D】',
  '【E】',   // Initial/Exploring
  '【Z】'    // Closed/Ended
]

/**
 * Default values for new deals
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
