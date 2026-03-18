/**
 * Email Notification Service
 * Handles email delivery for notifications using Nodemailer with SMTP
 */

import nodemailer from 'nodemailer'
import { renderNotificationEmail, getSubjectLine } from '@/lib/email/notificationTemplates'
import type { NotificationType, NotificationCategory } from '@/lib/supabase/database.types'

/**
 * SMTP configuration from environment
 */
interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

/**
 * Get SMTP configuration from environment
 * Throws error if configuration is invalid
 */
function getSMTPConfig(): SMTPConfig {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.warn('[Email Service] SMTP configuration incomplete. Email notifications will be skipped.')
    throw new Error('SMTP configuration incomplete')
  }

  return {
    host,
    port,
    secure: port === 465, // SSL for port 465, TLS for others
    auth: { user, pass }
  }
}

/**
 * Initialize Nodemailer transport
 * Caches transport instance for reuse
 */
let transportCache: nodemailer.Transporter | null = null

export function initializeSMTPTransport(): nodemailer.Transporter | null {
  try {
    const config = getSMTPConfig()
    transportCache = nodemailer.createTransport(config)

    // Verify connection
    transportCache.verify((error, success) => {
      if (error) {
        console.error('[Email Service] SMTP connection failed:', error)
      } else {
        console.log('[Email Service] SMTP connection ready')
      }
    })

    return transportCache
  } catch (error) {
    console.error('[Email Service] Failed to initialize SMTP transport:', error)
    return null
  }
}

/**
 * Get or create SMTP transport
 */
function getTransport(): nodemailer.Transporter | null {
  if (!transportCache) {
    return initializeSMTPTransport()
  }
  return transportCache
}

/**
 * Send notification email
 * Implements retry logic with exponential backoff (1s, 4s, 16s)
 */
export async function sendNotificationEmail(params: {
  to: string
  toName?: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  data?: Record<string, any>
}): Promise<{ success: boolean; error?: string }> {
  const { to, toName, type, category, title, message, data } = params
  const transport = getTransport()

  if (!transport) {
    console.warn('[Email Service] Cannot send email - SMTP transport not available')
    return { success: false, error: 'SMTP transport not available' }
  }

  const from = process.env.SMTP_FROM || 'noreply@example.com'
  const fromName = process.env.SMTP_FROM_NAME || 'MC Team Hub'

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
      const info = await transport.sendMail({
        from: `"${fromName}" <${from}>`,
        to,
        subject,
        text,
        html
      })

      console.log(`[Email Service] Email sent successfully to ${to} (MessageId: ${info.messageId})`)
      return { success: true }
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries

      if (isLastAttempt) {
        console.error(`[Email Service] Failed to send email to ${to} after ${maxRetries + 1} attempts:`, error.message)
        return { success: false, error: error.message }
      }

      // Wait before retry
      const delay = retryDelays[attempt]
      console.warn(`[Email Service] Email send attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return { success: false, error: 'Max retries exceeded' }
}

/**
 * Log email delivery error to database
 * This is called by the notification service after email send fails
 */
export async function logDeliveryError(params: {
  notificationId?: string
  errorType: string
  errorMessage: string
}): Promise<void> {
  const { notificationId, errorType, errorMessage } = params

  try {
    // Import here to avoid circular dependency
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

    console.log(`[Email Service] Logged delivery error: ${errorType}`)
  } catch (error) {
    console.error('[Email Service] Failed to log delivery error:', error)
  }
}
