/**
 * Notification Bell Component
 * Displays bell icon with unread count badge
 * Triggers dropdown open on click
 */

'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'

export interface NotificationBellProps {
  unreadCount: number
  onClick: () => void
}

/**
 * Get badge color based on count
 */
function getBadgeColor(count: number): string {
  if (count === 0) return 'bg-gray-400'
  if (count < 10) return 'bg-red-500'
  return 'bg-red-600' // 10+ shows darker red
}

/**
 * Format count for display (e.g., "9" or "9+")
 */
function formatCount(count: number): string {
  return count > 99 ? '99+' : count.toString()
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  const badgeColor = getBadgeColor(unreadCount)
  const displayCount = formatCount(unreadCount)
  const showBadge = unreadCount > 0

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative h-9 w-9 hover:bg-blue-50"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'}`} />

      {/* Unread Badge */}
      {showBadge && (
        <span
          className={`absolute -top-1 -right-1 ${badgeColor} text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1`}
        >
          {displayCount}
        </span>
      )}
    </Button>
  )
}
