/**
 * Workflow Notification Service
 * Triggers notifications for grading workflow events
 * Integrates with notification service (in-app) and email service
 */

import { createAdminClient } from '@query-stream-ai/db/admin'
import { triggerNotification } from '@/lib/services/notificationService'
import { sendNotificationEmail, logDeliveryError } from '@/lib/services/notificationEmailService'
import type { NotificationType } from '@/lib/supabase/database.types'

/**
 * Notify Leaders when challenge status changes to "grading"
 * NOTIF-10: Notification when challenge status changes to "grading" (to Leaders)
 */
export async function notifyLeadersGradingStarted(challengeId: string, challengeName: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Fetch all Leaders assigned to this challenge
    const { data: leaders } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'leader')

    if (!leaders || leaders.length === 0) {
      console.log(`[Workflow Notification] No leaders found for challenge ${challengeId}`)
      return
    }

    // Trigger notification for each Leader
    for (const leader of leaders) {
      const title = 'Grading Required'
      const message = `Challenge "${challengeName}" is now ready for grading. Please review and grade essay submissions.`
      const type: NotificationType = 'urgent'

      // Trigger in-app notification
      const { notificationId, emailEnabled, inappEnabled } = await triggerNotification(
        leader.id,
        type,
        'challenge',
        title,
        message,
        { challenge_id: challengeId }
      )

      console.log(`[Workflow Notification] Notified leader ${leader.id} for grading start: inapp=${inappEnabled}, email=${emailEnabled}`)

      // Send email if enabled (async, non-blocking)
      if (emailEnabled && leader.email) {
        sendNotificationEmail({
          to: leader.email,
          toName: leader.name || undefined,
          type,
          category: 'challenge',
          title,
          message,
          data: { actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/challenges/${challengeId}` }
        }).catch((error) => {
          console.error(`[Workflow Notification] Failed to send email to ${leader.email}:`, error)
          logDeliveryError({
            notificationId: notificationId || undefined,
            errorType: 'smtp_error',
            errorMessage: error.message
          })
        })
      }
    }
  } catch (error) {
    console.error('[Workflow Notification] Error in notifyLeadersGradingStarted:', error)
  }
}

/**
 * Notify Managers when Leader submits grades for approval
 * NOTIF-11: Notification when Leader submits grades for approval (to Managers)
 */
export async function notifyManagersGradesSubmitted(
  challengeId: string,
  challengeName: string,
  leaderName: string,
  submissionCount: number
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Fetch all Managers and Admins
    const { data: managers } = await supabase
      .from('users')
      .select('id, name, email')
      .in('role', ['manager', 'admin'])

    if (!managers || managers.length === 0) {
      console.log(`[Workflow Notification] No managers found for challenge ${challengeId}`)
      return
    }

    // Trigger notification for each Manager
    for (const manager of managers) {
      const title = 'Grades Ready for Approval'
      const message = `${leaderName} has submitted ${submissionCount} submission(s) for grading in "${challengeName}". Please review and approve.`
      const type: NotificationType = 'urgent'

      // Trigger in-app notification
      const { notificationId, emailEnabled, inappEnabled } = await triggerNotification(
        manager.id,
        type,
        'challenge',
        title,
        message,
        { challenge_id: challengeId }
      )

      console.log(`[Workflow Notification] Notified manager ${manager.id} for grades submitted: inapp=${inappEnabled}, email=${emailEnabled}`)

      // Send email if enabled (async, non-blocking)
      if (emailEnabled && manager.email) {
        sendNotificationEmail({
          to: manager.email,
          toName: manager.name || undefined,
          type,
          category: 'challenge',
          title,
          message,
          data: { actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/challenges/${challengeId}/grading` }
        }).catch((error) => {
          console.error(`[Workflow Notification] Failed to send email to ${manager.email}:`, error)
          logDeliveryError({
            notificationId: notificationId || undefined,
            errorType: 'smtp_error',
            errorMessage: error.message
          })
        })
      }
    }
  } catch (error) {
    console.error('[Workflow Notification] Error in notifyManagersGradesSubmitted:', error)
  }
}

/**
 * Notify Leaders when Manager approves/rejects grades
 * NOTIF-12: Notification when Manager approves grades (to Leaders)
 */
export async function notifyLeadersGradeApproved(
  challengeId: string,
  challengeName: string,
  approved: boolean,
  managerNotes?: string
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Fetch all Leaders
    const { data: leaders } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'leader')

    if (!leaders || leaders.length === 0) {
      console.log(`[Workflow Notification] No leaders found for challenge ${challengeId}`)
      return
    }

    const title = approved ? 'Grades Approved' : 'Grades Rejected'
    const type: NotificationType = approved ? 'success' : 'urgent'
    const statusText = approved ? 'approved' : 'rejected'
    const message = managerNotes
      ? `Your grades for "${challengeName}" have been ${statusText}. Note: ${managerNotes}`
      : `Your grades for "${challengeName}" have been ${statusText}.`

    // Trigger notification for each Leader
    for (const leader of leaders) {
      // Trigger in-app notification
      const { notificationId, emailEnabled, inappEnabled } = await triggerNotification(
        leader.id,
        type,
        'challenge',
        title,
        message,
        { challenge_id: challengeId }
      )

      console.log(`[Workflow Notification] Notified leader ${leader.id} for grade ${statusText}: inapp=${inappEnabled}, email=${emailEnabled}`)

      // Send email if enabled (async, non-blocking)
      if (emailEnabled && leader.email) {
        sendNotificationEmail({
          to: leader.email,
          toName: leader.name || undefined,
          type,
          category: 'challenge',
          title,
          message,
          data: { actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/challenges/${challengeId}` }
        }).catch((error) => {
          console.error(`[Workflow Notification] Failed to send email to ${leader.email}:`, error)
          logDeliveryError({
            notificationId: notificationId || undefined,
            errorType: 'smtp_error',
            errorMessage: error.message
          })
        })
      }
    }
  } catch (error) {
    console.error('[Workflow Notification] Error in notifyLeadersGradeApproved:', error)
  }
}

/**
 * Notify all Users when scores are published
 * NOTIF-13: Notification when scores are published (to Users)
 */
export async function notifyUsersScoresPublished(challengeId: string, challengeName: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Fetch all Users (all roles, not just members)
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('role', ['admin', 'manager', 'leader', 'member'])

    if (!users || users.length === 0) {
      console.log(`[Workflow Notification] No users found for challenge ${challengeId}`)
      return
    }

    const title = 'Scores Published'
    const message = `Scores for "${challengeName}" have been published. Check your ranking on the leaderboard!`
    const type: NotificationType = 'success'

    // Trigger notification for each User
    for (const user of users) {
      // Trigger in-app notification
      const { notificationId, emailEnabled, inappEnabled } = await triggerNotification(
        user.id,
        type,
        'challenge',
        title,
        message,
        { challenge_id: challengeId }
      )

      console.log(`[Workflow Notification] Notified user ${user.id} for scores published: inapp=${inappEnabled}, email=${emailEnabled}`)

      // Send email if enabled (async, non-blocking)
      if (emailEnabled && user.email) {
        sendNotificationEmail({
          to: user.email,
          toName: user.name || undefined,
          type,
          category: 'challenge',
          title,
          message,
          data: { actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/challenges/${challengeId}` }
        }).catch((error) => {
          console.error(`[Workflow Notification] Failed to send email to ${user.email}:`, error)
          logDeliveryError({
            notificationId: notificationId || undefined,
            errorType: 'smtp_error',
            errorMessage: error.message
          })
        })
      }
    }
  } catch (error) {
    console.error('[Workflow Notification] Error in notifyUsersScoresPublished:', error)
  }
}
