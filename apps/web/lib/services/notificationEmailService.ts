/**
 * Email Notification Service
 * Handles email delivery for notifications using Resend
 * Re-export of resendEmailService for backward compatibility
 */

// Re-export everything from the Resend email service
export {
  sendResendEmail as sendNotificationEmail,
  logDeliveryError
} from '@/lib/services/resendEmailService'

// Note: This file now acts as a compatibility layer.
// The actual implementation is in resendEmailService.ts
//
// Required environment variables:
//   RESEND_API_KEY=your_resend_api_key
//   RESEND_FROM_EMAIL=noreply@yourdomain.com
//   RESEND_FROM_NAME=MC Team Hub
//   RESEND_REPLY_TO=noreply@yourdomain.com (optional)
//
// Get your API key from: https://resend.com/api-keys
