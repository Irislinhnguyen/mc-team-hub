// ============================================================================
// SALES LISTS TYPE DEFINITIONS
// ============================================================================

/**
 * Sales list (campaign container)
 */
export interface SalesList {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

/**
 * Item types supported in lists
 */
export type SalesListItemType =
  | 'domain_app_id'
  | 'domain'
  | 'pid'
  | 'mid'
  | 'publisher'
  | 'custom'

/**
 * Source of list item
 */
export type SalesListItemSource = 'gcpp_check' | 'manual' | 'csv_import'

/**
 * List item (publisher, app, domain, etc.)
 */
export interface SalesListItem {
  id: string
  list_id: string
  item_type: SalesListItemType
  item_value: string
  item_label: string | null
  source: SalesListItemSource
  added_by: string
  added_at: string
  metadata: Record<string, any>
}

/**
 * Activity types
 */
export type ActivityType = 'contact' | 'response' | 'note'

/**
 * Contact outcome types
 */
export type ContactOutcome = 'contacted' | 'retarget' | 'follow_up'

/**
 * Response outcome types
 */
export type ResponseOutcome = 'positive' | 'negative' | 'neutral'

/**
 * Closed status types
 */
export type ClosedStatus = 'closed_won' | 'closed_lost'

/**
 * Activity log entry
 */
export interface SalesListActivity {
  id: string
  list_item_id: string
  activity_type: ActivityType
  contact_time: string
  response_time: string | null
  contact_outcome: ContactOutcome | null
  response_outcome: ResponseOutcome | null
  closed_status: ClosedStatus | null
  deal_value: number | null
  notes: string | null
  logged_by: string
  logged_at: string
  metadata: Record<string, any>
}

/**
 * List sharing permissions
 */
export type SharePermission = 'view' | 'edit'

/**
 * List share record
 */
export interface SalesListShare {
  id: string
  list_id: string
  shared_with_user_id: string
  shared_by_user_id: string
  permission: SharePermission
  created_at: string
}

/**
 * Enriched list item with auto-calculated fields
 */
export interface SalesListItemSummary extends SalesListItem {
  current_status: string | null
  latest_contact_type: ContactOutcome | null
  total_contacts: number
  retarget_count: number
  positive_count: number
  negative_count: number
  last_contact_at: string | null
  last_response_at: string | null
  last_activity_by: string | null
  deal_value: number | null
  successful_retargets: number
}

/**
 * List with summary statistics
 */
export interface SalesListWithStats extends SalesList {
  total_items: number
  total_contacts: number
  total_retargets: number
  closed_won_count: number
  closed_lost_count: number
  positive_count: number
  negative_count: number
  awaiting_count: number
}

/**
 * List analytics/metrics
 */
export interface SalesListAnalytics {
  list_id: string
  list_name: string

  // Overall metrics
  total_items: number
  total_contacts: number
  total_retargets: number

  // Outcomes
  closed_won: number
  closed_lost: number
  positive_responses: number
  negative_responses: number
  neutral_responses: number
  awaiting_response: number

  // Deal values
  total_deal_value: number
  avg_deal_value: number

  // Retarget analysis
  retarget_success_rate: number
  avg_contacts_per_item: number
  avg_retargets_per_item: number
  items_with_3plus_retargets: number

  // Response time analysis
  avg_response_time_hours: number
  fastest_response_hours: number
  slowest_response_hours: number

  // PIC performance
  pic_performance: PICPerformance[]

  // Time-based metrics
  contacts_by_day: ContactsByDay[]
  outcomes_by_week: OutcomesByWeek[]
}

/**
 * PIC (Person In Charge) performance metrics
 */
export interface PICPerformance {
  user_id: string
  user_email: string
  total_contacts: number
  total_retargets: number
  positive_responses: number
  negative_responses: number
  closed_won: number
  closed_lost: number
  total_deal_value: number
  avg_response_time_hours: number
  retarget_success_rate: number
}

/**
 * Contacts by day for timeline charts
 */
export interface ContactsByDay {
  date: string
  contact_count: number
  retarget_count: number
  response_count: number
}

/**
 * Outcomes by week for trend analysis
 */
export interface OutcomesByWeek {
  week_start: string
  positive_count: number
  negative_count: number
  neutral_count: number
  closed_won_count: number
  closed_lost_count: number
}

// ============================================================================
// INPUT TYPES FOR API REQUESTS
// ============================================================================

/**
 * Input for creating a new list
 */
export interface CreateSalesListInput {
  name: string
  description?: string
  color?: string
}

/**
 * Input for updating a list
 */
export interface UpdateSalesListInput {
  name?: string
  description?: string | null
  color?: string
}

/**
 * Input for adding items to a list
 */
export interface AddListItemInput {
  item_type: SalesListItemType
  item_value: string
  item_label?: string
  source?: SalesListItemSource
  metadata?: Record<string, any>
}

/**
 * Input for logging an activity
 */
export interface LogActivityInput {
  list_item_id: string
  activity_type: ActivityType
  contact_time?: string
  response_time?: string
  contact_outcome?: ContactOutcome
  response_outcome?: ResponseOutcome
  closed_status?: ClosedStatus
  deal_value?: number
  notes?: string
  metadata?: Record<string, any>
}

/**
 * Input for updating an activity
 */
export interface UpdateActivityInput {
  contact_time?: string
  response_time?: string | null
  contact_outcome?: ContactOutcome | null
  response_outcome?: ResponseOutcome | null
  closed_status?: ClosedStatus | null
  deal_value?: number | null
  notes?: string | null
  metadata?: Record<string, any>
}

/**
 * Input for sharing a list
 */
export interface ShareListInput {
  shared_with_user_id: string
  permission: SharePermission
}

/**
 * Input for updating share permission
 */
export interface UpdateShareInput {
  permission: SharePermission
}

/**
 * CSV import row structure
 */
export interface CSVImportRow {
  item_type: string
  item_value: string
  item_label?: string
  team?: string
  partner?: string
  product?: string
  notes?: string
}

/**
 * CSV import result
 */
export interface CSVImportResult {
  success: boolean
  imported_count: number
  duplicate_count: number
  error_count: number
  errors: Array<{
    row: number
    error: string
  }>
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQueryParams {
  list_id: string
  start_date?: string
  end_date?: string
  pic_user_id?: string
}

/**
 * Retarget suggestion
 */
export interface RetargetSuggestion {
  item_id: string
  item_value: string
  item_label: string | null
  last_contact_at: string
  days_since_contact: number
  current_status: string
  retarget_count: number
  reason: string
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Status badge configuration
 */
export interface StatusBadgeConfig {
  icon: string
  color: 'green' | 'red' | 'yellow' | 'gray' | 'blue'
  label: string
  description: string
}

/**
 * Filter options for list items
 */
export interface ListItemFilters {
  status?: string[]
  contact_attempts?: string
  retarget_count?: string
  last_contact?: string
  assigned_to?: string
  source?: SalesListItemSource[]
}

/**
 * Sort options for list items
 */
export type ListItemSortOption =
  | 'last_contact_desc'
  | 'last_contact_asc'
  | 'status'
  | 'contact_count_desc'
  | 'retarget_count_desc'
  | 'response_time_asc'
  | 'response_time_desc'

/**
 * Bulk action types
 */
export type BulkActionType =
  | 'add_to_list'
  | 'remove_from_list'
  | 'log_activity'
  | 'export_csv'
