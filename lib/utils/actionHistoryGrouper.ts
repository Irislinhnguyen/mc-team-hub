/**
 * Action History Grouper
 * Groups activity log entries into complete action snapshots
 */

import type { PipelineActivityLogWithUser } from '@/lib/types/pipeline'

export interface ActionSnapshot {
  timestamp: string
  user: string
  user_email: string | null
  action_date: string | null
  next_action: string | null
  action_detail: string | null
  action_progress: string | null
}

/**
 * Group action_update activity logs into complete action snapshots
 * Groups entries that occurred within 5 seconds of each other (same "Save" operation)
 */
export function groupActionHistory(
  activities: PipelineActivityLogWithUser[]
): ActionSnapshot[] {
  if (activities.length === 0) return []

  // Group by timestamp (within 5-second window)
  const groups: PipelineActivityLogWithUser[][] = []
  let currentGroup: PipelineActivityLogWithUser[] = []
  let currentTimestamp: Date | null = null

  for (const activity of activities) {
    const activityTime = new Date(activity.logged_at)

    if (!currentTimestamp) {
      // First activity
      currentTimestamp = activityTime
      currentGroup = [activity]
    } else {
      // Check if within 5-second window
      const timeDiff = Math.abs(activityTime.getTime() - currentTimestamp.getTime())

      if (timeDiff <= 5000) {
        // Same group (within 5 seconds)
        currentGroup.push(activity)
      } else {
        // New group
        if (currentGroup.length > 0) {
          groups.push([...currentGroup])
        }
        currentTimestamp = activityTime
        currentGroup = [activity]
      }
    }
  }

  // Add last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  // Convert groups to action snapshots
  return groups.map(group => buildActionSnapshot(group))
}

/**
 * Build a complete action snapshot from a group of activity logs
 */
function buildActionSnapshot(
  group: PipelineActivityLogWithUser[]
): ActionSnapshot {
  const snapshot: ActionSnapshot = {
    timestamp: group[0].logged_at,
    user: group[0].user_name || group[0].user_email || 'Unknown User',
    user_email: group[0].user_email,
    action_date: null,
    next_action: null,
    action_detail: null,
    action_progress: null,
  }

  // Fill in values from activity logs
  for (const activity of group) {
    switch (activity.field_changed) {
      case 'action_date':
        snapshot.action_date = activity.new_value
        break
      case 'next_action':
        snapshot.next_action = activity.new_value
        break
      case 'action_detail':
        snapshot.action_detail = activity.new_value
        break
      case 'action_progress':
        snapshot.action_progress = activity.new_value
        break
    }
  }

  return snapshot
}

/**
 * Check if an action snapshot has any non-null values (exclude progress)
 */
export function hasActionData(snapshot: ActionSnapshot): boolean {
  return !!(
    snapshot.action_date ||
    snapshot.next_action ||
    snapshot.action_detail
  )
}
