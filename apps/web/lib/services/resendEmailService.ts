/**
 * Resend Email Service
 * Handles email delivery for notifications using Resend API
 * Docs: https://resend.com/docs/api-reference/introduction
 */

import { Resend } from 'resend'
import { renderNotificationEmail, getSubjectLine } from '@/lib/email/notificationTemplates'
import type { NotificationType, NotificationCategory } from '@/lib/supabase/database.types'

/**
 * Get Resend client instance
 * Throws error if API key is not configured
 */
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[Resend Email] RESEND_API_KEY not configured. Email notifications will be skipped.')
    throw new Error('RESEND_API_KEY not configured')
  }

  return new Resend(apiKey)
}

/**
 * Get "from" email address from environment
 * Defaults to noreply@resend.dev for testing
 */
function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'
}

/**
 * Get "from" name from environment
 */
function getFromName(): string {
  return process.env.RESEND_FROM_NAME || 'MC Team Hub'
}

/**
 * Send notification email using Resend
 * Implements retry logic with exponential backoff (1s, 4s, 16s)
 */
export async function sendResendEmail(params: {
  to: string
  toName?: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  data?: Record<string, any>
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const { to, toName, type, category, title, message, data } = params

  let resend: Resend | null = null

  try {
    resend = getResendClient()
  } catch (error) {
    console.warn('[Resend Email] Cannot send email - Resend client not available')
    return { success: false, error: 'Resend client not available' }
  }

  const fromEmail = getFromEmail()
  const fromName = getFromName()
  const from = `${fromName} <${fromEmail}>`

  // Render email templates
  const { html, text } = renderNotificationEmail({
    type,
    category,
    title,
    message,
    userName: toName,
    data
  })

  const subject = getSubjectLine(type, category, title)

  // Retry configuration: up to 3 retries with exponential backoff
  const maxRetries = 3
  const retryDelays = [1000, 4000, 16000] // 1s, 4s, 16s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from,
        to: [to],
        subject,
        html,
        text,
        // Add reply-to for better user experience
        replyTo: process.env.RESEND_REPLY_TO || fromEmail,
      })

      console.log(`[Resend Email] Email sent successfully to ${to} (MessageId: ${result.data?.id})`)

      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries

      if (isLastAttempt) {
        console.error(`[Resend Email] Failed to send email to ${to} after ${maxRetries + 1} attempts:`, error.message)
        return {
          success: false,
          error: error.message
        }
      }

      // Wait before retry
      const delay = retryDelays[attempt]
      console.warn(`[Resend Email] Email send attempt ${attempt + 1} failed: ${error.message}, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}

/**
 * Log email delivery error to database
 * This is called after email send fails
 */
export async function logDeliveryError(params: {
  notificationId?: string
  errorType: string
  errorMessage: string
}): Promise<void> {
  const { notificationId, errorType, errorMessage } = params

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    await supabase
      .from('notification_delivery_errors')
      .insert({
        notification_id: notificationId || null,
        error_type: errorType,
        error_message: errorMessage,
        retry_count: 0
      })

    console.log(`[Resend Email] Logged delivery error: ${errorType}`)
  } catch (error) {
    console.error('[Resend Email] Failed to log delivery error:', error)
  }
}
