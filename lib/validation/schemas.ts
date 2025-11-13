/**
 * Zod Validation Schemas
 *
 * Centralized input validation for all API endpoints
 * Prevents injection attacks and ensures data integrity
 */

import { z } from 'zod'

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * ISO date format YYYY-MM-DD
 */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email format')

/**
 * Period schema (start and end dates)
 */
export const periodSchema = z.object({
  start: isoDateSchema,
  end: isoDateSchema
})

// ============================================================================
// Authentication Schemas
// ============================================================================

/**
 * Login with password request
 */
export const loginPasswordSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// ============================================================================
// Filter Preset Schemas
// ============================================================================

/**
 * Filter type enum
 */
export const filterTypeSchema = z.enum(['standard', 'advanced', 'deep_dive'])

/**
 * Create filter preset request
 */
export const createFilterPresetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  page: z.string().min(1, 'Page is required'),
  filters: z.record(z.any()),
  description: z.string().optional(),
  cross_filters: z.array(z.any()).optional(),
  simplified_filter: z.any().optional(),
  filter_type: filterTypeSchema.optional(),
  advanced_filter_names: z.array(z.string()).optional(),
  is_default: z.boolean().optional()
})

/**
 * Update filter preset request
 */
export const updateFilterPresetSchema = createFilterPresetSchema.partial()

// ============================================================================
// Deep Dive Schemas
// ============================================================================

/**
 * Perspective type
 */
export const perspectiveSchema = z.enum(['team', 'pic', 'pid', 'mid', 'product', 'zone'])

/**
 * Tier filter
 */
export const tierFilterSchema = z.enum(['hero', 'solid', 'underperformer', 'remove', 'new', 'lost'])

/**
 * Deep dive request
 */
export const deepDiveRequestSchema = z.object({
  perspective: perspectiveSchema,
  period1: periodSchema,
  period2: periodSchema,
  filters: z.record(z.any()),
  simplifiedFilter: z.any().optional(),
  parentId: z.union([z.string(), z.number()]).optional(),
  tierFilter: tierFilterSchema.optional()
})

// ============================================================================
// Team Management Schemas
// ============================================================================

/**
 * Assign PIC to team request
 */
export const assignPicToTeamSchema = z.object({
  team_id: z.string().min(1, 'Team ID is required'),
  pic: z.string().min(1, 'PIC is required')
})

/**
 * Unassign PIC from team request
 */
export const unassignPicFromTeamSchema = z.object({
  pic: z.string().min(1, 'PIC is required')
})

// ============================================================================
// Analytics Query Schemas
// ============================================================================

/**
 * Date range for analytics queries
 */
export const dateRangeSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema
})

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate request body against schema
 * Returns parsed data or throws validation error
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(`Validation failed: ${messages}`)
    }
    throw error
  }
}

/**
 * Safely validate request body (returns result object instead of throwing)
 */
export function safeValidateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  error?: string
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data
    }
  }

  const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
  return {
    success: false,
    error: messages
  }
}

// ============================================================================
// Sales Lists Schemas
// ============================================================================

/**
 * Item type enum
 */
export const salesListItemTypeSchema = z.enum(['domain_app_id', 'domain', 'pid', 'mid', 'publisher', 'custom'])

/**
 * Item source enum
 */
export const salesListItemSourceSchema = z.enum(['gcpp_check', 'manual', 'csv_import'])

/**
 * Activity type enum
 */
export const activityTypeSchema = z.enum(['contact', 'response', 'note'])

/**
 * Contact outcome enum
 */
export const contactOutcomeSchema = z.enum(['contacted', 'retarget', 'follow_up'])

/**
 * Response outcome enum
 */
export const responseOutcomeSchema = z.enum(['positive', 'negative', 'neutral'])

/**
 * Closed status enum
 */
export const closedStatusSchema = z.enum(['closed_won', 'closed_lost'])

/**
 * Share permission enum
 */
export const sharePermissionSchema = z.enum(['view', 'edit'])

/**
 * Create sales list request
 */
export const createSalesListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format, expected hex color').optional()
})

/**
 * Update sales list request
 */
export const updateSalesListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format, expected hex color').optional()
})

/**
 * Add list item request
 */
export const addListItemSchema = z.object({
  item_type: salesListItemTypeSchema,
  item_value: z.string().min(1, 'Item value is required'),
  item_label: z.string().optional(),
  source: salesListItemSourceSchema.optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * Add multiple list items request
 */
export const addListItemsSchema = z.object({
  items: z.array(addListItemSchema).min(1, 'At least one item is required')
})

/**
 * Log activity request
 */
export const logActivitySchema = z.object({
  list_item_id: z.string().uuid('Invalid list item ID'),
  activity_type: activityTypeSchema,
  contact_time: z.string().datetime().optional(),
  response_time: z.string().datetime().optional(),
  contact_outcome: contactOutcomeSchema.optional(),
  response_outcome: responseOutcomeSchema.optional(),
  closed_status: closedStatusSchema.optional(),
  deal_value: z.number().positive().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * Update activity request
 */
export const updateActivitySchema = z.object({
  contact_time: z.string().datetime().optional(),
  response_time: z.string().datetime().nullable().optional(),
  contact_outcome: contactOutcomeSchema.nullable().optional(),
  response_outcome: responseOutcomeSchema.nullable().optional(),
  closed_status: closedStatusSchema.nullable().optional(),
  deal_value: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * Share list request
 */
export const shareListSchema = z.object({
  shared_with_user_id: z.string().uuid('Invalid user ID'),
  permission: sharePermissionSchema
})

/**
 * Update share permission request
 */
export const updateShareSchema = z.object({
  permission: sharePermissionSchema
})

/**
 * CSV import row schema
 */
export const csvImportRowSchema = z.object({
  item_type: z.string(),
  item_value: z.string().min(1),
  item_label: z.string().optional(),
  team: z.string().optional(),
  partner: z.string().optional(),
  product: z.string().optional(),
  notes: z.string().optional()
})

/**
 * Analytics query parameters
 */
export const analyticsQuerySchema = z.object({
  start_date: isoDateSchema.optional(),
  end_date: isoDateSchema.optional(),
  pic_user_id: z.string().uuid().optional()
})
