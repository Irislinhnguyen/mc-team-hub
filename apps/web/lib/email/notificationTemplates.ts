/**
 * Email Templates for Notifications
 * HTML email templates with inline styles for different notification types
 */

import type { NotificationType, NotificationCategory } from '@/lib/supabase/database.types'

/**
 * Get email subject line based on notification type and category
 */
export function getSubjectLine(
  type: NotificationType,
  category: NotificationCategory,
  title: string
): string {
  const prefixMap: Record<NotificationType, string> = {
    urgent: '[Action Required] ',
    info: '[Update] ',
    success: '[Completed] '
  }

  return `${prefixMap[type]}${title}`
}

/**
 * Get notification type color for styling
 */
function getTypeColor(type: NotificationType): string {
  const colorMap: Record<NotificationType, { bg: string; text: string; border: string }> = {
    urgent: {
      bg: '#FEF2F2',
      text: '#991B1B',
      border: '#FCA5A5'
    },
    info: {
      bg: '#EFF6FF',
      text: '#1E40AF',
      border: '#93C5FD'
    },
    success: {
      bg: '#F0FDF4',
      text: '#166534',
      border: '#86EFAC'
    }
  }

  return colorMap[type]
}

/**
 * Get category icon (emoji fallback)
 */
function getCategoryIcon(category: NotificationCategory): string {
  const iconMap: Record<NotificationCategory, string> = {
    challenge: '🏆',
    bible: '📚',
    system: '⚙️',
    team: '👥'
  }

  return iconMap[category]
}

/**
 * Render HTML email for notification
 * Uses inline styles for email client compatibility
 */
export function renderNotificationEmail(params: {
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  userName?: string
  data?: Record<string, any>
}): { html: string; text: string } {
  const { type, category, title, message, userName = 'Team Member', data } = params
  const colors = getTypeColor(type)
  const icon = getCategoryIcon(category)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F3F4F6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid #E5E7EB;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 24px; font-weight: 700; color: #1565C0;">
                    MC Team Hub
                  </td>
                  <td style="text-align: right; font-size: 32px;">
                    ${icon}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6B7280;">
                Hi ${userName},
              </p>
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: ${colors.text};">
                ${title}
              </h1>

              <!-- Notification Type Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: ${colors.text}; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${type}
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 16px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                ${message}
              </p>

              <!-- Action Data (if present) -->
              ${data?.actionUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #1565C0; border-radius: 8px; padding: 0;">
                    <a href="${data.actionUrl}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none;">
                      View Details →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #E5E7EB; background-color: #F9FAFB; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                This notification was sent from MC Team Hub. To manage your notification preferences, visit your settings page.
              </p>
            </td>
          </tr>
        </table>

        <!-- Unsubscribe info -->
        <p style="margin: 24px auto 0; max-width: 600px; font-size: 12px; color: #9CA3AF; text-align: center;">
          © ${new Date().getFullYear()} MC Team Hub. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  // Plain text version
  const text = `
MC Team Hub ${icon}

Hi ${userName},

${title}

${message}

${data?.actionUrl ? `View details: ${data.actionUrl}` : ''}

---
This notification was sent from MC Team Hub. To manage your notification preferences, visit your settings page.
© ${new Date().getFullYear()} MC Team Hub. All rights reserved.
  `.trim()

  return { html, text }
}
