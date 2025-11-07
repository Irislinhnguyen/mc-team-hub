/**
 * Account Lockout Service
 *
 * Prevents brute force attacks by locking accounts after failed login attempts
 */

import { createAdminClient } from '../supabase/admin'
import { logger } from '../utils/logger'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

export interface LockoutStatus {
  isLocked: boolean
  attemptsRemaining: number
  lockedUntil?: Date
}

/**
 * Check if account is currently locked
 */
export async function isAccountLocked(email: string): Promise<LockoutStatus> {
  const supabase = createAdminClient()

  const { data: user } = (await supabase
    .from('users')
    .select('failed_login_attempts, locked_until')
    .eq('email', email)
    .single()) as { data: any }

  if (!user) {
    return {
      isLocked: false,
      attemptsRemaining: MAX_FAILED_ATTEMPTS
    }
  }

  const now = new Date()
  const lockedUntil = (user as any).locked_until ? new Date((user as any).locked_until) : null

  // Check if currently locked
  if (lockedUntil && lockedUntil > now) {
    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockedUntil
    }
  }

  // Not locked, calculate remaining attempts
  const attempts = user.failed_login_attempts || 0
  return {
    isLocked: false,
    attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - attempts)
  }
}

/**
 * Record a failed login attempt
 * Returns true if account is now locked
 */
export async function recordFailedLogin(email: string): Promise<boolean> {
  const supabase = createAdminClient()

  // Get current user data
  const { data: user } = (await supabase
    .from('users')
    .select('failed_login_attempts, locked_until')
    .eq('email', email)
    .single()) as { data: any }

  if (!user) {
    // User doesn't exist, nothing to record
    return false
  }

  const now = new Date()
  const currentAttempts = user.failed_login_attempts || 0

  // Check if already locked and still within lockout period
  if (user.locked_until && new Date(user.locked_until) > now) {
    logger.warn('Login attempt on locked account', {
      email,
      lockedUntil: user.locked_until
    })
    return true
  }

  // If lockout period expired, reset attempts
  const attempts = user.locked_until && new Date(user.locked_until) < now
    ? 1
    : currentAttempts + 1

  // Lock account if max attempts reached
  const shouldLock = attempts >= MAX_FAILED_ATTEMPTS
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60000)
    : null

  // Update database
  await ((supabase as any)
    .from('users')
    .update({
      failed_login_attempts: attempts,
      locked_until: lockedUntil?.toISOString() || null
    })
    .eq('email', email))

  if (shouldLock) {
    logger.warn('Account locked due to failed login attempts', {
      email,
      attempts,
      lockedUntil: lockedUntil?.toISOString()
    })
  } else {
    logger.info('Failed login attempt recorded', {
      email,
      attempts,
      attemptsRemaining: MAX_FAILED_ATTEMPTS - attempts
    })
  }

  return shouldLock
}

/**
 * Reset failed login attempts (call after successful login)
 */
export async function resetFailedAttempts(email: string): Promise<void> {
  const supabase = createAdminClient()

  await ((supabase as any)
    .from('users')
    .update({
      failed_login_attempts: 0,
      locked_until: null
    })
    .eq('email', email))

  logger.debug('Failed login attempts reset', { email })
}

/**
 * Get time remaining until unlock (in minutes)
 */
export function getMinutesUntilUnlock(lockedUntil: Date): number {
  const now = new Date()
  const diffMs = lockedUntil.getTime() - now.getTime()
  return Math.ceil(diffMs / 60000)
}

/**
 * Manually unlock an account (admin function)
 */
export async function unlockAccount(email: string): Promise<void> {
  const supabase = createAdminClient()

  await ((supabase as any)
    .from('users')
    .update({
      failed_login_attempts: 0,
      locked_until: null
    })
    .eq('email', email))

  logger.info('Account manually unlocked', { email })
}
