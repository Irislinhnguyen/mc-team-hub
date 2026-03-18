/**
 * Notification Dropdown Component
 * Displays scrollable list of notifications with click-to-read functionality
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

export interface Notification {
  id: string
  type: 'urgent' | 'info' | 'success'
  category: 'challenge' | 'bible' | 'system' | 'team'
  title: string
  message: string
  data: Record<string, any> | null
  read_at: string | null
  created_at: string
}

export interface NotificationDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Get notification type styling
 */
function getNotificationStyles(type: string) {
  const styles = {
    urgent: {
      icon: <Bell className="h-4 w-4 text-red-600" />,
      borderLeft: 'border-l-4 border-l-red-500'
    },
    info: {
      icon: <Bell className="h-4 w-4 text-blue-600" />,
      borderLeft: 'border-l-4 border-l-blue-500'
    },
    success: {
      icon: <Check className="h-4 w-4 text-green-600" />,
      borderLeft: 'border-l-4 border-l-green-500'
    }
  }

  return styles[type as keyof typeof styles] || styles.info
}

/**
 * Fetch notifications hook
 */
function useNotifications(limit = 10) {
  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data = await res.json()
      return data.notifications as Notification[]
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000 // Poll every 30 seconds
  })
}

export function NotificationDropdown({ open, onOpenChange }: NotificationDropdownProps) {
  const router = useRouter()
  const { data: notifications, isLoading, error } = useNotifications(10)

  /**
   * Handle notification click - mark as read and navigate
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'PATCH'
        })
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    // Navigate to relevant page
    const { data } = notification || {}
    if (data?.challenge_id) {
      router.push(`/challenges/${data.challenge_id}`)
    } else if (data?.submission_id) {
      router.push(`/admin/challenges/${data.challenge_id}/grading`)
    } else if (data?.bible_article_id) {
      router.push(`/bible/articles/${data.bible_article_id}`)
    }

    // Close dropdown
    onOpenChange(false)
  }

  return (
    <div className="relative">
      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/notifications')}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              View all
            </Button>
          </div>

          {/* Notification List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Failed to load notifications
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const styles = getNotificationStyles(notification.type)
                  const isUnread = !notification.read_at

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${styles.borderLeft} ${isUnread ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 mt-0.5 ${isUnread ? '' : 'opacity-60'}`}>
                          {styles.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.title}
                          </div>
                          <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
