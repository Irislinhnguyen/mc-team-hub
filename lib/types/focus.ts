/**
 * Focus of the Month Types
 * Domain models for focus-based pipeline suggestion tracking
 */

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export const FOCUS_STATUSES = ['draft', 'published', 'archived'] as const
export type FocusStatus = (typeof FOCUS_STATUSES)[number]

export const SUGGESTION_STATUSES = ['pending', 'created', 'cannot_create', 'skipped'] as const
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]

export const ACTIVITY_TYPES = [
  'created',
  'published',
  'archived',
  'suggestion_added',
  'suggestion_removed',
  'suggestion_completed',
  'pipeline_matched',
] as const
export type FocusActivityType = (typeof ACTIVITY_TYPES)[number]

export const CANNOT_CREATE_REASONS = [
  'No traffic',
  'Publisher declined',
  'Already using similar product',
  'Technical limitation',
  'Other',
] as const
export type CannotCreateReason = (typeof CANNOT_CREATE_REASONS)[number]

// =====================================================
// CORE DOMAIN TYPES
// =====================================================

/**
 * Focus of the Month - Main entity
 */
export interface Focus {
  id: string
  created_by: string

  // Time Period
  focus_month: number // 1-12
  focus_year: number

  // Organization
  group_type: 'sales' | 'cs'
  team_id: string | null // NULL = all teams

  // Metadata
  title: string
  description: string | null

  // Status
  status: FocusStatus
  targeted_product: string | null // The product being targeted (e.g., "flexiblesticky")
  published_at: string | null
  published_by: string | null

  // Query Lab Linkage
  source_session_ids: string[] | null

  // Audit
  created_at: string
  updated_at: string

  // Computed (not in DB, added by API)
  suggestion_count?: number
  created_count?: number
  failed_count?: number
  unavailable_count?: number
  pending_count?: number
}

/**
 * Focus Suggestion - Individual pipeline suggestion
 */
export interface FocusSuggestion {
  id: string
  focus_id: string

  // Core Identifiers
  pid: string | null
  mid: string // Required
  product: string // Required

  // Display Info
  media_name: string | null
  publisher_name: string | null
  pic: string | null

  // Metrics from Query Lab
  last_30d_requests: number | null
  six_month_avg_requests: number | null
  thirty_day_avg_revenue: number | null

  // Query Lab Data
  query_lab_data: Record<string, any> | null

  // Pipeline Matching
  pipeline_created: boolean
  matched_pipeline_id: string | null
  quarter: string | null // Quarter of most recent month (e.g., "Q1 2025")

  // User Actions
  user_status: SuggestionStatus | null
  cannot_create_reason: string | null
  user_remark: string | null
  completed_at: string | null
  completed_by: string | null

  // Display
  display_order: number

  // Audit
  created_at: string
  updated_at: string

  // Computed (not in DB, added by API)
  matched_pipeline?: {
    id: string
    name: string | null
    status: string
    publisher: string
  } | null
}

/**
 * Focus Activity Log Entry
 */
export interface FocusActivity {
  id: string
  focus_id: string

  activity_type: FocusActivityType

  suggestion_id: string | null
  details: Record<string, any> | null
  notes: string | null

  logged_by: string
  logged_at: string

  // Computed (added by API)
  logged_by_user?: {
    name: string
    email: string
  } | null
}

/**
 * Focus Manager Role
 */
export interface FocusManagerRole {
  id: string
  user_id: string
  team_id: string | null // NULL = can manage all teams

  // Permissions
  can_create: boolean
  can_publish: boolean
  can_delete: boolean

  // Audit
  granted_by: string
  granted_at: string

  // Computed (added by API)
  user?: {
    name: string
    email: string
  }
  granted_by_user?: {
    name: string
    email: string
  }
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Create Focus Request
 */
export interface CreateFocusRequest {
  focus_month: number
  focus_year: number
  group_type: 'sales' | 'cs'
  team_id?: string | null
  title: string
  description?: string
  targeted_product?: string | null
}

/**
 * Update Focus Request
 */
export interface UpdateFocusRequest {
  title?: string
  description?: string
  status?: FocusStatus
}

/**
 * Add Suggestions from Query Lab Request
 */
export interface AddSuggestionsRequest {
  suggestions: Array<{
    pid?: string | null
    mid: string
    product: string
    media_name?: string
    publisher_name?: string
    pic?: string
    last_30d_requests?: number
    six_month_avg_requests?: number
    thirty_day_avg_revenue?: number
    query_lab_data?: Record<string, any>
  }>
  source_session_id?: string // Link to query_lab_sessions
}

/**
 * Update Suggestion Status Request
 */
export interface UpdateSuggestionRequest {
  user_status?: SuggestionStatus
  cannot_create_reason?: string
  user_remark?: string
  pipeline_created?: boolean // Allow manual override
  quarter?: string // Quarter of most recent month
}

/**
 * Grant Manager Role Request
 */
export interface GrantManagerRoleRequest {
  user_id: string
  team_id?: string | null
  can_create?: boolean
  can_publish?: boolean
  can_delete?: boolean
}

// =====================================================
// DASHBOARD & METRICS TYPES
// =====================================================

/**
 * Focus Dashboard Metrics
 */
export interface FocusDashboardMetrics {
  total_suggestions: number
  created: number // user_status = 'created' OR pipeline_created = true
  failed: number // matched_pipeline.status = '【Z】'
  unavailable: number // user_status = 'cannot_create'
  pending: number // user_status = 'pending' OR NULL

  by_team: Array<{
    team: string
    team_name: string
    total: number
    created: number
    failed: number
    unavailable: number
    pending: number
  }>

  by_status_tier: Array<{
    status: string
    count: number
  }>

  timeline: Array<{
    date: string
    created: number
  }>

  completion_rate: number // (created + unavailable) / total * 100
}

/**
 * Focus Impact Metrics
 * Same structure as Pipeline Impact
 */
export interface FocusImpact {
  id: string
  publisher: string
  poc: string
  status: string
  slot_type: 'new' | 'existing'
  actual_starting_date: string
  projected_30d: number
  actual_30d: number
  variance: number
  variance_percent: number
  affected_zones: string[]
  affected_zones_count: number
  pid: string | null
  mid: string | null
  granularity: string
  calculated_days: number
  is_locked?: boolean

  // Additional fields from focus
  source_focus_suggestion_id: string | null
  suggestion?: FocusSuggestion
}

// =====================================================
// LIST & FILTER TYPES
// =====================================================

/**
 * Focus List Filters
 */
export interface FocusListFilters {
  month?: number // 1-12
  year?: number
  team?: string
  group?: 'sales' | 'cs'
  status?: FocusStatus | FocusStatus[]
  search?: string // Search in title/description
}

/**
 * Suggestion List Filters
 */
export interface SuggestionListFilters {
  team?: string
  pic?: string
  status?: SuggestionStatus | SuggestionStatus[]
  product?: string
  pipeline_created?: boolean
}

// =====================================================
// PAGINATION TYPES
// =====================================================

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// =====================================================
// FORM & INPUT TYPES
// =====================================================

/**
 * Focus Creation Wizard Steps
 */
export interface FocusWizardStep1 {
  focus_month: number
  focus_year: number
  group_type: 'sales' | 'cs'
  team_id: string | null
}

export interface FocusWizardStep2 {
  // Query Lab session
}

export interface FocusWizardStep3 {
  title: string
  description: string
  suggestions: Array<{
    mid: string
    pid?: string
    product: string
    media_name?: string
    publisher_name?: string
    pic?: string
    last_30d_requests?: number
    six_month_avg_requests?: number
    thirty_day_avg_revenue?: number
  }>
}

// =====================================================
// VALIDATION SCHEMAS (for Zod)
// =====================================================

export const focusValidation = {
  title: {
    minLength: 3,
    maxLength: 200,
  },
  description: {
    maxLength: 1000,
  },
  focus_month: {
    min: 1,
    max: 12,
  },
  focus_year: {
    min: 2020,
    max: 2100,
  },
}

export const suggestionValidation = {
  mid: {
    required: true,
    minLength: 1,
  },
  product: {
    required: true,
    minLength: 1,
  },
  user_remark: {
    maxLength: 500,
  },
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Focus with Suggestions (for detail view)
 */
export interface FocusWithSuggestions extends Focus {
  suggestions: FocusSuggestion[]
}

/**
 * Focus Summary (for list view cards)
 */
export interface FocusSummary {
  id: string
  title: string
  focus_month: number
  focus_year: number
  group_type: 'sales' | 'cs'
  team_id: string | null
  status: FocusStatus
  suggestion_count: number
  created_count: number
  completion_rate: number
  created_at: string
}

/**
 * Permission Check Result
 */
export interface FocusPermissions {
  canView: boolean
  canEdit: boolean
  canPublish: boolean
  canDelete: boolean
  canAddSuggestions: boolean
  canDeleteSuggestions: boolean
  canUpdateSuggestionStatus: boolean
}
