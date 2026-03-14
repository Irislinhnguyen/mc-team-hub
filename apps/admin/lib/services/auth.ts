/**
 * Authentication and Security Service
 * Ported from My-gi-publisher-assistant src/security/auth.py
 */

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { settings } from '../utils/config'
import { createAdminClient } from '../supabase/admin'
import { logger } from '../utils/logger'
import {
  isAccountLocked,
  recordFailedLogin,
  resetFailedAttempts,
  getMinutesUntilUnlock
} from './accountLockout'

export interface UserData {
  email: string
  name?: string
  role: string
  accessLevel: string
  authType?: string
  [key: string]: any
}

export interface TokenPayload {
  sub: string
  role: string
  access_level: string
  auth_type: string
  email?: string
  name?: string
  exp: number
  iat: number
}

export class AuthService {
  private secretKey: string
  private algorithm: 'HS256' = 'HS256'
  private accessTokenExpireHours: number = 8

  constructor() {
    this.secretKey = settings.jwtSecretKey

    // Security validation for JWT secret key
    if (!this.secretKey) {
      throw new Error('JWT_SECRET_KEY is not configured')
    }

    // Ensure minimum length for security
    if (this.secretKey.length < 32) {
      throw new Error('JWT_SECRET_KEY must be at least 32 characters long for security')
    }

    // Warn if key appears weak (all same characters, sequential, etc.)
    if (this.isWeakSecret(this.secretKey)) {
      console.warn('[Auth] WARNING: JWT_SECRET_KEY appears to be weak. Please use a strong random string.')
    }
  }

  /**
   * Check if secret appears to be weak
   */
  private isWeakSecret(secret: string): boolean {
    // Check for repeated characters (e.g., "aaaaaaaaaa...")
    if (/^(.)\1+$/.test(secret)) {
      return true
    }

    // Check for sequential patterns (e.g., "123456789", "abcdefgh")
    const sequences = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
    for (const seq of sequences) {
      if (secret.includes(seq.substring(0, 8))) {
        return true
      }
    }

    // Check for common weak passwords
    const weakPatterns = ['password', 'secret', 'admin', 'test', '12345']
    for (const pattern of weakPatterns) {
      if (secret.toLowerCase().includes(pattern)) {
        return true
      }
    }

    return false
  }

  /**
   * Create JWT access token
   */
  createAccessToken(username: string, userData: UserData): string {
    const now = Date.now()
    const expireMs = this.accessTokenExpireHours * 60 * 60 * 1000

    const payload: TokenPayload = {
      sub: username,
      role: userData.role || 'user',
      access_level: userData.accessLevel || 'read',
      auth_type: userData.authType || 'local',
      exp: Math.floor((now + expireMs) / 1000),
      iat: Math.floor(now / 1000),
    }

    // Add optional fields
    if (userData.email) {
      payload.email = userData.email
    }
    if (userData.name) {
      payload.name = userData.name
    }

    const token = jwt.sign(payload, this.secretKey, { algorithm: this.algorithm })

    logger.info('Access token created', {
      username,
      authType: userData.authType || 'local',
      role: userData.role
    })
    return token
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.secretKey, {
        algorithms: [this.algorithm],
      }) as TokenPayload

      const username = payload.sub
      if (!username) {
        throw new Error('Invalid token: missing username')
      }

      return payload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw error
    }
  }

  /**
   * Create session cookie token
   */
  createSessionCookie(userProfile: UserData): string {
    const email = userProfile.email

    if (!email) {
      throw new Error('Email is required for session cookie')
    }

    const now = Date.now()
    const expireMs = this.accessTokenExpireHours * 60 * 60 * 1000
    const sessionId = crypto.randomBytes(16).toString('hex')

    const payload: any = {
      sub: email,
      role: userProfile.role || 'user',
      access_level: userProfile.accessLevel || 'read',
      auth_type: 'oauth_session',
      name: userProfile.name || '',
      exp: Math.floor((now + expireMs) / 1000),
      iat: Math.floor(now / 1000),
      session_id: sessionId,
    }

    const sessionToken = jwt.sign(payload, this.secretKey, { algorithm: this.algorithm })

    logger.info('Session cookie created', { email, role: userProfile.role })
    return sessionToken
  }

  /**
   * Verify session token from cookie
   */
  verifySessionCookie(sessionToken: string): TokenPayload {
    try {
      const payload = jwt.verify(sessionToken, this.secretKey, {
        algorithms: [this.algorithm],
      }) as TokenPayload

      const username = payload.sub
      if (!username) {
        throw new Error('Invalid session: missing username')
      }

      return payload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Session has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid session')
      }
      throw error
    }
  }

  /**
   * Register OAuth user and create session
   */
  registerOAuthUser(userProfile: UserData): string {
    const userData: UserData = {
      ...userProfile,
      authType: 'oauth',
    }

    return this.createAccessToken(userProfile.email, userData)
  }

  /**
   * Hash password with bcrypt (for secure password storage)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  /**
   * Verify password against bcrypt hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Refresh access token from database
   * Fetches current user data from database and issues new JWT token
   */
  async refreshAccessToken(email: string): Promise<{ user: UserData; token: string } | null> {
    try {
      const supabase = createAdminClient()

      // Query user from database
      const { data: user, error } = (await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()) as { data: any; error: any }

      if (error || !user) {
        logger.warn('Token refresh failed: user not found', { email })
        return null
      }

      // Create user data with current database values
      const userData: UserData = {
        email: user.email,
        name: user.name,
        role: user.role,
        accessLevel: user.role === 'admin' ? 'write' : 'read',
        authType: user.password_hash ? 'password' : 'oauth',
      }

      // Generate new JWT token
      const token = this.createAccessToken(user.email, userData)

      logger.info('Token refreshed successfully', { email, role: user.role })
      return { user: userData, token }
    } catch (error) {
      logger.error('Error during token refresh', error)
      return null
    }
  }

  /**
   * Login with email and password (for admin users)
   */
  async loginWithPassword(
    email: string,
    password: string
  ): Promise<{ user: UserData; token: string } | null> {
    try {
      // Check if account is locked
      const lockoutStatus = await isAccountLocked(email)
      if (lockoutStatus.isLocked && lockoutStatus.lockedUntil) {
        const minutesRemaining = getMinutesUntilUnlock(lockoutStatus.lockedUntil)
        logger.warn('Login blocked: account is locked', {
          email,
          minutesRemaining
        })
        throw new Error(`Account is temporarily locked. Please try again in ${minutesRemaining} minutes.`)
      }

      const supabase = createAdminClient()

      // Query user from database
      const { data: user, error } = (await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()) as { data: any; error: any }

      if (error || !user) {
        logger.warn('Login failed: user not found', { email })
        // Still record failed attempt even if user doesn't exist (to prevent user enumeration timing attacks)
        await recordFailedLogin(email)
        return null
      }

      // Check if user has password auth enabled
      if (!user.password_hash) {
        logger.warn('Login failed: password auth not enabled', { email })
        await recordFailedLogin(email)
        return null
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password_hash)
      if (!isPasswordValid) {
        logger.warn('Login failed: invalid password', { email })
        await recordFailedLogin(email)
        return null
      }

      // Success - reset failed attempts
      await resetFailedAttempts(email)

      // Create user data
      const userData: UserData = {
        email: user.email,
        name: user.name,
        role: user.role,
        accessLevel: user.role === 'admin' ? 'write' : 'read',
        authType: 'password',
      }

      // Generate JWT token
      const token = this.createAccessToken(user.email, userData)

      logger.info('Password login successful', { email, role: user.role })
      return { user: userData, token }
    } catch (error) {
      logger.error('Error during password login', error)
      return null
    }
  }
}

// Global instance
export const authService = new AuthService()
