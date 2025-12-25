/**
 * Pipeline Activity Detector
 * Detects which fields changed in a pipeline update and determines activity type
 */

import type { ActivityType } from '@/lib/types/pipeline'

interface FieldChange {
  field: string
  oldValue: string | null
  newValue: string | null
  activityType: ActivityType
}

// Define which fields to track for activity logging
const TRACKED_FIELDS = {
  action_update: ['action_date', 'next_action', 'action_detail', 'action_progress'],
  forecast_update: ['imp', 'ecpm', 'revenue_share', 'max_gross'],
  field_update: [
    'starting_date',
    'end_date',
    'publisher',
    'poc',
    'domain',
    'team',
    'region',
    'product',
    'channel',
    'classification',
    'proposal_date',
    'interested_date',
    'acceptance_date',
    'ready_to_deliver_date', // NEW: Auto-logged when status → A
    'actual_starting_date', // NEW: Auto-logged when status → S-
    'close_won_date', // NEW: Auto-logged when status → S
  ],
} as const

/**
 * Detect which tracked fields changed between old and new data
 */
export function detectChangedFields(
  oldData: Record<string, any>,
  newData: Record<string, any>
): FieldChange[] {
  const changes: FieldChange[] = []

  // Check each tracked field category
  for (const [activityType, fields] of Object.entries(TRACKED_FIELDS)) {
    for (const field of fields) {
      // Skip if field wasn't in the update
      if (!(field in newData)) continue

      // Skip status (handled by database trigger)
      if (field === 'status') continue

      const oldValue = oldData[field]
      const newValue = newData[field]

      // Normalize values for comparison
      const normalizedOld = normalizeValue(oldValue)
      const normalizedNew = normalizeValue(newValue)

      if (normalizedOld !== normalizedNew) {
        changes.push({
          field,
          oldValue: normalizedOld,
          newValue: normalizedNew,
          activityType: activityType as ActivityType,
        })
      }
    }
  }

  return changes
}

/**
 * Normalize value for comparison
 */
function normalizeValue(value: any): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'boolean') return value.toString()
  return String(value)
}

/**
 * Determine activity type based on field name
 */
export function determineActivityType(field: string): ActivityType {
  for (const [type, fields] of Object.entries(TRACKED_FIELDS)) {
    if (fields.includes(field as any)) {
      return type as ActivityType
    }
  }
  return 'field_update'
}
