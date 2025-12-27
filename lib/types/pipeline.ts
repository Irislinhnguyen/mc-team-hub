/**
 * Pipeline Management Types
 * Domain models for sales pipeline tracking system
 *
 * Updated: Flat architecture - each pipeline IS a deal/opportunity
 */

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export const PIPELINE_STAGES = [
  '【S】',
  '【S-】',
  '【A】',
  '【B】',
  '【C+】',
  '【C】',
  '【C-】',
  '【D】',
  '【E】',
] as const

export type PipelineStageCode = (typeof PIPELINE_STAGES)[number]

export const PIPELINE_GROUPS = ['sales', 'cs'] as const
export type PipelineGroup = (typeof PIPELINE_GROUPS)[number]

export const FORECAST_TYPES = ['estimate', 'out_of_estimate'] as const
export type ForecastType = (typeof FORECAST_TYPES)[number]

export const ACTIVITY_TYPES = [
  'status_change',
  'note',
  'action_update',
  'forecast_update',
  'field_update',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

// POC names - Default fallback list (actual list fetched from /api/pipelines/metadata)
export const POC_NAMES = [
  'Cassandra',
  'Febri',
  'Raven',
  'Safitri',
  'Sheren',
  'Zenda',
  'Zenny'
] as const
export type PocName = string // Changed to string to allow dynamic POC names from API

// Classification types (Column C) - from Google Sheets dropdown
export const CLASSIFICATION_TYPES = [
  'New Unit (New Slot)',
  'New Unit (Slot exists)',
  'Existing Unit (Slot exists)',
  'adjustment',
  'New Acquisition',
] as const
export type ClassificationType = (typeof CLASSIFICATION_TYPES)[number]

// Channel types (Column J)
export const CHANNEL_TYPES = [
  'Ad refresh',
  'Adsense Program',
  'Audio banner',
  'Banner',
  'banner',
  'Collapsible Anchor',
  'Flexible Sticky',
  'Flexible sticky',
  'Flexible sticky (new offer)',
  'Full potential pack:\nVideo Sticky Mixed Wipe Ads\nInterstial\nBanners\nOverlay\nAdRecovery',
  'In-page',
  'Inpage',
  'Interstitial',
  'interstitial',
  'Interstital',
  'Introduce to Zahra (new PIC)',
  'Offer AdX',
  'Offer Adx',
  'Offerwall',
  'Overlay',
  'reward ad',
  'Rewarded Ads',
  'VDO ad',
  'Video ad sticky',
  'Video inread',
  'Video mix Wipe Ads',
  'Video outstream + wipead',
  'Video outstream mix wipead',
  'Video oustream + wipead',
  'Wipead',
  'Wipead => flexible sticky',
] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]

// Teams
export const TEAMS = ['SEA', 'India'] as const
export type TeamName = (typeof TEAMS)[number]

// Regions
export const REGIONS = [
  'Thailand',
  'Malaysia',
  'Indonesia',
  'India',
  'Singapore',
  'Vietnam',
  'Philippines',
] as const
export type RegionName = (typeof REGIONS)[number]

// Product types (Column P) - merged from both Sales & CS sheets (14 options total)
export const PRODUCT_TYPES = [
  'Ad Recover',
  'Banner',
  'Flexible Sticky',
  'Interstitial',
  'Outstream',
  'Rewarded Ads',
  'Sticky',
  'Video / Wipe',
  '[App] App open',
  '[App] Banner',
  '[App] Interstitial',
  '[App] Native',
  '[App] Rewarded',
  'other',
] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

// Next Action options (from master sheet)
export const NEXT_ACTION_TYPES = [
  'Follow Up',
  'sMarketing',
  'Irregular Offer',
  'Compromise Option',
  'Give Up',
] as const
export type NextActionType = (typeof NEXT_ACTION_TYPES)[number]

// Action Detail options (from master sheet)
export const ACTION_DETAIL_TYPES = [
  'Follow Up By IC',
  'Follow Up By Manager',
  'Follow Up By Director',
  'Follow Up By CEO/COO',
  '┗ Pattern 1: Create Urgency',
  '┗ Pattern 2: Activate by Funny Message',
  '┗ Pattern 3: Strong Pitching for USP/Difference',
  '┗ Pattern 4:',
  'Offline Meeting',
  'Physical Gifting',
  'Digital Gifting',
  'Customized Message',
  'Invitation to Event/ Webiner',
  'MG',
  'Matching Competitor',
  'Free Trial / RS Adjustment',
  'Kick Back Offer',
  'Short Payment Cycle Offer',
  'Prepayment',
  'Go Live on Small Unit',
  'Proposal of Other Product - AR',
  'Proposal of Other Product - Video',
  'Proposal of Other Product - App',
  'Proposal of Other Product - Format',
  'Return to Marketing',
  'Not going to chase for NOW',
  'NEVER REACH',
] as const
export type ActionDetailType = (typeof ACTION_DETAIL_TYPES)[number]

// =====================================================
// DATABASE ENTITIES
// =====================================================

/**
 * Pipeline - Merged model (was pipelines + pipeline_deals)
 * Each pipeline represents one opportunity/publisher deal
 */
export interface Pipeline {
  id: string
  user_id: string

  // Metadata (organizational fields)
  name: string
  description: string | null
  fiscal_year: number
  fiscal_quarter: number | null
  group: PipelineGroup // 'sales' or 'cs'

  // ===== MERGED FROM pipeline_deals =====

  // Basic Info
  classification: string | null
  poc: string
  team: string | null
  pid: string | null
  publisher: string
  mid: string | null // Column H - Media ID / Site ID
  medianame: string | null // Media name (auto-filled from MID or manual entry)
  domain: string | null
  channel: string | null
  region: string | null
  product: string | null

  // Impact Tracking
  /**
   * Array of zone IDs (ZID) affected by this pipeline
   * Used to calculate actual revenue from BigQuery for variance calculation
   * Example: ["123", "456", "789"]
   */
  affected_zones: string[] | null

  // ===== REVENUE METRICS =====

  // USER INPUT FIELDS (editable)
  /** Column R - USER EDITABLE: Impressions in 30 days */
  imp: number | null
  /** Column S - USER EDITABLE: Cost per 1000 impressions (eCPM) */
  ecpm: number | null
  /** Column T - USER EDITABLE: Maximum gross revenue per month */
  max_gross: number | null
  /** Column U - USER EDITABLE: Revenue share percentage (0-100) */
  revenue_share: number | null

  // AUTO-CALCULATED FIELDS (read-only - computed on save)
  /** Column P - CALCULATED: Daily gross revenue = max_gross / 30 */
  day_gross: number | null
  /** Column Q - CALCULATED: Daily net revenue = day_gross × (revenue_share / 100) */
  day_net_rev: number | null

  // Status & Timeline
  /** Column AC - USER EDITABLE: Pipeline status (affects revenue calculation) */
  status: PipelineStageCode
  /** Column AD - USER EDITABLE: Progress percentage (0-100, used in revenue formula) */
  progress_percent: number | null

  // ===== DATE FIELDS =====

  // USER EDITABLE REQUIRED FIELDS
  /** Column AB - USER EDITABLE (REQUIRED): Starting date PROJECTION (used for delivery_days calculation) */
  starting_date: string | null
  /** USER EDITABLE (REQUIRED): Proposal date - when proposal was submitted to client */
  proposal_date: string | null

  // USER EDITABLE OPTIONAL FIELDS
  /** Column AX - USER EDITABLE: End date (optional, used for delivery_days calculation) */
  end_date: string | null

  // AUTO-LOGGED STATUS MILESTONE DATES (Set automatically when status changes)
  /** AUTO-LOGGED: Set when status → C or C- (client shows interest) - First time only */
  interested_date: string | null
  /** AUTO-LOGGED: Set when status → B (client accepts proposal) - First time only */
  acceptance_date: string | null
  /** AUTO-LOGGED: Set when status → A (ready to deliver / tags sent) - First time only */
  ready_to_deliver_date: string | null
  /** AUTO-LOGGED: Set when status → S- (distribution actually started) - First time only. Different from starting_date which is projection */
  actual_starting_date: string | null
  /** AUTO-LOGGED: Set when status → S (deal fully won) - Calculated as actual_starting_date + 7 days */
  close_won_date: string | null

  // ===== S- TO S CONFIRMATION TRACKING =====
  /** Confirmation status for S- to S transition: pending (awaiting confirmation), confirmed (user approved), declined (user rejected) */
  s_confirmation_status: 'pending' | 'confirmed' | 'declined' | null
  /** Timestamp when user confirmed S- to S transition. Actual confirmation date (not projected). */
  s_confirmed_at: string | null
  /** Timestamp when user declined/snoozed S- to S confirmation */
  s_declined_at: string | null
  /** Optional notes from user explaining confirmation decision */
  s_confirmation_notes: string | null

  // Action Tracking
  action_date: string | null
  next_action: string | null
  action_detail: string | null
  action_progress: string | null

  // ===== QUARTERLY SUMMARY (AUTO-CALCULATED) =====
  /** Column AJ - CALCULATED: Sum of 3 months gross revenue */
  q_gross: number | null
  /** Column AK - CALCULATED: Sum of 3 months net revenue */
  q_net_rev: number | null

  // Forecast Type
  forecast_type: ForecastType

  // Other
  competitors: string | null

  /**
   * JSONB field - Contains quarterly_breakdown and other data
   * quarterly_breakdown structure (CALCULATED on save):
   * {
   *   gross: { first_month, middle_month, last_month },
   *   net: { first_month, middle_month, last_month }
   * }
   */
  metadata: Record<string, any>

  // Activity Tracking (enriched from activity logs)
  last_activity_date: string | null
  notes_count: number

  // Related data (joined from other tables)
  monthly_forecasts?: PipelineMonthlyForecast[]

  // Audit
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface PipelineStage {
  code: PipelineStageCode
  name: string
  description: string | null
  estimate_percent: number
  out_of_estimate_percent: number
  sort_order: number
  color: string
  created_at: string
}

export interface PipelineMonthlyForecast {
  id: string
  pipeline_id: string
  year: number
  month: number
  gross_revenue: number | null
  net_revenue: number | null
  end_date: string | null
  delivery_days: number | null
  validation_flag: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PipelineActivityLog {
  id: string
  pipeline_id: string
  activity_type: ActivityType
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  notes: string | null
  logged_by: string
  logged_at: string
}

export interface PipelineActivityLogWithUser extends PipelineActivityLog {
  user_name: string | null
  user_email: string | null
}

// =====================================================
// ENRICHED VIEWS
// =====================================================

export interface PipelineSummary extends Pipeline {
  // Calculated fields
  total_forecast_gross: number
  total_forecast_net: number

  // Stage info
  status_name: string
  status_description: string | null
  estimate_percent: number
  out_of_estimate_percent: number
  status_color: string
  status_sort_order: number

  // Activity info
  activity_count: number
  last_activity_at: string | null
  days_in_status: number
}

export interface PipelineWithForecast extends Pipeline {
  monthly_forecast: PipelineMonthlyForecast[]
}

// =====================================================
// INPUT TYPES (for API requests)
// =====================================================

export interface CreatePipelineInput {
  // Required fields
  publisher: string
  poc: string
  group: PipelineGroup

  // Metadata
  name?: string // Auto-generated from publisher if not provided
  description?: string
  fiscal_year?: number
  fiscal_quarter?: number | null

  // Basic Info (optional)
  classification?: string
  team?: string
  pid?: string
  mid?: string // Media ID / Site ID
  medianame?: string // Media name (auto-filled from MID or manual entry)
  domain?: string
  channel?: string
  region?: string
  product?: string

  // Impact Tracking
  /** Array of zone IDs (ZID) affected by this pipeline */
  affected_zones?: string[]

  // ===== REVENUE INPUT FIELDS =====
  /** USER INPUT: Impressions (30 days) */
  imp?: number
  /** USER INPUT: eCPM */
  ecpm?: number
  /** USER INPUT: Maximum gross revenue per month */
  max_gross?: number
  /** USER INPUT: Revenue share percentage (0-100) */
  revenue_share?: number

  // Note: day_gross, day_net_rev, q_gross, q_net_rev are CALCULATED - do not provide

  // Status & Timeline
  status?: PipelineStageCode
  /** USER INPUT: Progress percentage (0-100) - affects revenue calculation */
  progress_percent?: number
  starting_date?: string
  end_date?: string
  proposal_date?: string
  interested_date?: string
  acceptance_date?: string

  // Action Tracking
  action_date?: string
  next_action?: string
  action_detail?: string
  action_progress?: string

  // Forecast Type
  forecast_type?: ForecastType

  // Other
  competitors?: string
  metadata?: Record<string, any>

  /**
   * Monthly forecast inputs (delivery days for current quarter)
   * If not provided, defaults to current fiscal quarter with null delivery_days
   */
  monthly_forecasts?: Array<{
    year: number
    month: number
    delivery_days: number | null
  }>
}

export interface UpdatePipelineInput extends Partial<CreatePipelineInput> {
  // Allow partial updates
}

export interface CreateMonthlyForecastInput {
  year: number
  month: number
  gross_revenue?: number
  net_revenue?: number
  delivery_days?: number
  validation_flag?: boolean
  notes?: string
}

export interface BulkCreateMonthlyForecastInput {
  pipeline_id: string
  forecasts: CreateMonthlyForecastInput[]
}

export interface LogActivityInput {
  activity_type: ActivityType
  field_changed?: string
  old_value?: string
  new_value?: string
  notes?: string
}

// =====================================================
// UI STATE TYPES
// =====================================================

export interface PipelineFilters {
  search?: string
  status?: PipelineStageCode[]
  poc?: string[]
  team?: string[]
  region?: string[]
  group?: PipelineGroup
  forecast_type?: ForecastType
  starting_date_from?: string
  starting_date_to?: string
}

export interface PipelineSortConfig {
  field: keyof Pipeline
  direction: 'asc' | 'desc'
}

export interface PipelineStats {
  total_pipelines: number
  total_gross: number
  total_net: number
  total_forecast_gross: number
  total_forecast_net: number
  pipelines_by_status: {
    code: PipelineStageCode
    name: string
    count: number
    total_value: number
    color: string
  }[]
  pipelines_by_poc: {
    poc: string
    count: number
    total_value: number
  }[]
  pipelines_by_team: {
    team: string
    count: number
    total_value: number
  }[]
}

// =====================================================
// FORM WIZARD TYPES
// =====================================================

export interface PipelineWizardStep {
  id: number
  title: string
  description: string
  fields: (keyof CreatePipelineInput)[]
}

export const PIPELINE_WIZARD_STEPS: PipelineWizardStep[] = [
  {
    id: 1,
    title: 'Basic Info',
    description: 'Publisher and team details',
    fields: [
      'publisher',
      'domain',
      'poc',
      'team',
      'region',
      'product',
      'classification',
    ],
  },
  {
    id: 2,
    title: 'Revenue & Metrics',
    description: 'Financial estimates',
    fields: [
      'day_gross',
      'day_net_rev',
      'imp',
      'ecpm',
      'max_gross',
      'revenue_share',
      'starting_date',
    ],
  },
  {
    id: 3,
    title: 'Status & Timeline',
    description: 'Pipeline stage and dates',
    fields: [
      'status',
      'progress_percent',
      'proposal_date',
      'interested_date',
      'acceptance_date',
    ],
  },
  {
    id: 4,
    title: 'Action Tracking',
    description: 'Next steps and details',
    fields: ['next_action', 'action_date', 'action_detail', 'action_progress'],
  },
  {
    id: 5,
    title: 'Review',
    description: 'Review and submit',
    fields: [],
  },
]

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// =====================================================
// EXPORT TYPES (Phase 2)
// =====================================================

export interface ExportColumnMapping {
  sheetColumn: number // 0-98 for 99 columns
  sheetHeader: string
  dbSource: 'pipeline' | 'forecast' | 'calculated'
  dbField?: keyof Pipeline
  transformer?: (pipeline: Pipeline, forecast?: PipelineMonthlyForecast[]) => any
}

export interface ExportOptions {
  filters?: PipelineFilters
  include_forecast: boolean
  format: 'google_sheets' | 'csv' | 'excel'
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

// =====================================================
// LEGACY TYPE ALIASES (for gradual migration)
// =====================================================

/** @deprecated Use Pipeline instead */
export type PipelineDeal = Pipeline

/** @deprecated Use PipelineMonthlyForecast instead */
export type DealMonthlyForecast = PipelineMonthlyForecast

/** @deprecated Use PipelineActivityLog instead */
export type DealActivityLog = PipelineActivityLog

/** @deprecated Use PipelineSummary instead */
export type PipelineDealSummary = PipelineSummary

/** @deprecated Use PipelineWithForecast instead */
export type DealWithForecast = PipelineWithForecast

/** @deprecated Use CreatePipelineInput instead */
export type CreateDealInput = CreatePipelineInput

/** @deprecated Use UpdatePipelineInput instead */
export type UpdateDealInput = UpdatePipelineInput

/** @deprecated Use PipelineFilters instead */
export type DealFilters = PipelineFilters

/** @deprecated Use PipelineSortConfig instead */
export type DealSortConfig = PipelineSortConfig

/** @deprecated Use PipelineWizardStep instead */
export type DealWizardStep = PipelineWizardStep

/** @deprecated Use PIPELINE_WIZARD_STEPS instead */
export const DEAL_WIZARD_STEPS = PIPELINE_WIZARD_STEPS
