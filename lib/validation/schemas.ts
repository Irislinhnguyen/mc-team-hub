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
