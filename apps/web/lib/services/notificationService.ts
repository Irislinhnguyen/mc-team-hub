/**
 * Notification Service
 * Handles creation, triggering, and preference management for notifications
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  NotificationInsert,
  NotificationType,
  NotificationCategory,
  NotificationData,
  UserNotificationPreferences
} from '@/lib/supabase/database.types'

/**
 * Default notification preferences by role (from CONTEXT.md decision)
 */
const DEFAULT_PREFERENCES: Record<string, UserNotificationPreferences> = {
  admin: { email: { challenge: true, bible: true, system: true, team: true }, inapp: { challenge: true, bible: true, system: true, team: true } },
  manager: { email: { challenge: true, bible: true, system: true, team: true }, inapp: { challenge: true, bible: true, system: true, team: true } },
  leader: { email: { challenge: true, bible: false, system: false, team: false }, inapp: { challenge: true, bible: true, system: true, team: true } },
  member: { email: { challenge: false, bible: false, system: false, team: false }, inapp: { challenge: true, bible: true, system: true, team: true } }
}

/**
 * Get user notification preferences
 * Creates default preferences if not exist
 */
export async function getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
  const supabase = createAdminClient()

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('email_enabled, inapp_enabled')
    .eq('user_id', userId)
    .single()

  if (prefs) {
    return {
      email: prefs.email_enabled as Record<NotificationCategory, boolean>,
      inapp: prefs.inapp_enabled as Record<NotificationCategory, boolean>
    }
  }

  // Get user role to determine defaults
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  const role = user?.role || 'member'
  const defaults = DEFAULT_PREFERENCES[role] || DEFAULT_PREFERENCES.member

  // Create default preferences
  await supabase
    .from('notification_preferences')
    .insert({
      user_id: userId,
      email_enabled: defaults.email,
      inapp_enabled: defaults.inapp
    })

  return defaults
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserNotificationPreferences>
): Promise<UserNotificationPreferences> {
  const supabase = createAdminClient()

  const current = await getUserPreferences(userId)
  const updated = {
    email: { ...current.email, ...(preferences.email || {}) },
    inapp: { ...current.inapp, ...(preferences.inapp || {}) }
  }

  await supabase
    .from('notification_preferences')
    .update({
      email_enabled: updated.email,
      inapp_enabled: updated.inapp,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  return updated
}

/**
 * Create a notification (doesn't check preferences)
 */
export async function createNotification(
  input: NotificationInsert
): Promise<string | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert(input)
      .select('id')
      .single()

    if (error) {
      console.error('[Notification Service] Error creating notification:', error)
      return null
    }

    console.log(`[Notification Service] Created notification ${data.id} for user ${input.user_id}`)
    return data.id
  } catch (error) {
    console.error('[Notification Service] Exception creating notification:', error)
    return null
  }
}

/**
 * Trigger notification (checks preferences, creates notification)
 * This is the main entry point for sending notifications
 */
export async function triggerNotification(
  userId: string,
  type: NotificationType,
  category: NotificationCategory,
  title: string,
  message: string,
  data?: NotificationData
): Promise<{ notificationId: string | null; emailEnabled: boolean; inappEnabled: boolean }> {
  const preferences = await getUserPreferences(userId)

  // Check if both channels are disabled
  const emailEnabled = preferences.email[category] || false
  const inappEnabled = preferences.inapp[category] || false

  if (!emailEnabled && !inappEnabled) {
    console.log(`[Notification Service] Notification skipped for user ${userId} - both channels disabled for ${category}`)
    return { notificationId: null, emailEnabled: false, inappEnabled: false }
  }

  // Create in-app notification if enabled
  let notificationId: string | null = null
  if (inappEnabled) {
    notificationId = await createNotification({
      user_id: userId,
      type,
      category,
      title,
      message,
      data: data || {}
    })
  }

  return { notificationId, emailEnabled, inappEnabled }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId) // Ensure user can only mark their own

    if (error) {
      console.error('[Notification Service] Error marking notification as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Notification Service] Exception marking notification as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
      .select('id')

    if (error) {
      console.error('[Notification Service] Error marking all as read:', error)
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('[Notification Service] Exception marking all as read:', error)
    return 0
  }
}

/**
 * Dismiss (soft delete) a notification
 */
export async function dismissNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.error('[Notification Service] Error dismissing notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Notification Service] Exception dismissing notification:', error)
    return false
  }
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient()

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)
      .is('dismissed_at', null)

    if (error) {
      console.error('[Notification Service] Error getting unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('[Notification Service] Exception getting unread count:', error)
    return 0
  }
}
