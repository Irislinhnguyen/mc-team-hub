/**
 * Activity Formatter Utilities
 * Formats pipeline activity log entries for display in the UI
 */

import type { ActivityType, PipelineActivityLog } from '@/lib/types/pipeline'
import type { LucideIcon } from 'lucide-react'
import { Bell, TrendingUp, Edit, FileText, MessageSquare } from 'lucide-react'

interface FormattedActivity {
  Icon: LucideIcon
  color: string
  description: string
}

/**
 * Format activity log entry for display
 */
export function formatActivity(activity: PipelineActivityLog): FormattedActivity {
  switch (activity.activity_type) {
    case 'status_change':
      return {
        Icon: Bell,
        color: 'border-blue-500 bg-blue-50',
        description: formatStatusChange(activity.old_value, activity.new_value),
      }

    case 'action_update':
      return {
        Icon: Edit,
        color: 'border-purple-500 bg-purple-50',
        description: formatFieldChange(
          activity.field_changed,
          activity.old_value,
          activity.new_value
        ),
      }

    case 'forecast_update':
      return {
        Icon: TrendingUp,
        color: 'border-green-500 bg-green-50',
        description: formatRevenueChange(
          activity.field_changed,
          activity.old_value,
          activity.new_value
        ),
      }

    case 'field_update':
      return {
        Icon: FileText,
        color: 'border-orange-500 bg-orange-50',
        description: formatFieldChange(
          activity.field_changed,
          activity.old_value,
          activity.new_value
        ),
      }

    case 'note':
      return {
        Icon: MessageSquare,
        color: 'border-gray-500 bg-gray-50',
        description: activity.notes || 'Note added',
      }

    default:
      return {
        Icon: FileText,
        color: 'border-gray-500 bg-gray-50',
        description: 'Activity logged',
      }
  }
}

/**
 * Format status change description
 */
function formatStatusChange(oldValue: string | null, newValue: string | null): string {
  if (oldValue && newValue) {
    return `Status changed from ${oldValue} to ${newValue}`
  }
  if (newValue) {
    return `Status set to ${newValue}`
  }
  return 'Status updated'
}

/**
 * Format field change description
 */
export function formatFieldChange(
  field: string | null,
  oldValue: string | null,
  newValue: string | null
): string {
  if (!field) return 'Field updated'

  const fieldLabel = field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())

  if (oldValue && newValue) {
    return `${fieldLabel}: ${oldValue} → ${newValue}`
  }
  if (newValue && !oldValue) {
    return `${fieldLabel} set to ${newValue}`
  }
  if (oldValue && !newValue) {
    return `${fieldLabel} cleared`
  }
  return `${fieldLabel} updated`
}

/**
 * Format revenue/forecast change description
 */
export function formatRevenueChange(
  field: string | null,
  oldValue: string | null,
  newValue: string | null
): string {
  if (!field) return 'Revenue recalculated'

  const formatCurrency = (val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return val
    return `$${num.toLocaleString()}`
  }

  const formatNumber = (val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return val
    return num.toLocaleString()
  }

  const fieldLabel =
    field === 'imp'
      ? 'Impressions'
      : field === 'ecpm'
      ? 'eCPM'
      : field === 'revenue_share'
      ? 'Revenue Share'
      : field === 'max_gross'
      ? 'Max Gross'
      : 'Revenue'

  if (oldValue && newValue) {
    if (field === 'revenue_share') {
      return `${fieldLabel}: ${oldValue}% → ${newValue}%`
    }
    if (field === 'imp') {
      return `${fieldLabel}: ${formatNumber(oldValue)} → ${formatNumber(newValue)}`
    }
    if (field === 'ecpm' || field === 'max_gross') {
      return `${fieldLabel}: ${formatCurrency(oldValue)} → ${formatCurrency(newValue)}`
    }
  }

  if (newValue) {
    return `${fieldLabel} set to ${field === 'revenue_share' ? newValue + '%' : formatCurrency(newValue)}`
  }

  return `${fieldLabel} updated`
}

/**
 * Format activity type for badge display
 */
export function formatActivityType(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    status_change: 'Status',
    action_update: 'Action',
    forecast_update: 'Revenue',
    field_update: 'Update',
    note: 'Note',
  }
  return labels[type] || type
}

/**
 * Get badge variant based on activity type
 */
export function getBadgeVariant(
  type: ActivityType
): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'status_change':
      return 'default'
    case 'note':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Get user initials from name
 */
export function getUserInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format timestamp as relative time
 */
export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return date.toLocaleDateString()
}
