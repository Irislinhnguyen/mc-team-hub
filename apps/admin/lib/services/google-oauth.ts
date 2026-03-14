/**
 * Google OAuth 2.0 Manager
 * Ported from My-gi-publisher-assistant src/security/google_oauth.py
 */

import { settings, isGoogleOAuthEnabled } from '../utils/config'
import crypto from 'crypto'

export interface UserProfile {
  email: string
  name: string
  givenName: string
  familyName: string
  picture: string
  googleId: string
  verifiedEmail: boolean
  domain: string
  role: string
  accessLevel: string
}

export class GoogleOAuthManager {
  private clientId: string
  private clientSecret: string
  private redirectUri: string
  private allowedDomain: string
  private authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
  private tokenUrl = 'https://oauth2.googleapis.com/token'
  private userinfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo'
  private scopes = ['openid', 'email', 'profile']

  constructor() {
    this.clientId = settings.googleClientId
    this.clientSecret = settings.googleClientSecret
    this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`
    this.allowedDomain = settings.allowedDomain

    if (!isGoogleOAuthEnabled()) {
      console.warn('[GoogleOAuth] Google OAuth credentials not configured')
    } else {
      console.log(`[GoogleOAuth] Configured for domain: ${this.allowedDomain}`)
    }
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): [string, string] {
    if (!state) {
      state = crypto.randomBytes(32).toString('hex')
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: 'select_account',
      hd: this.allowedDomain, // Hosted domain parameter
    })

    const authUrl = `${this.authorizationUrl}?${params.toString()}`
    console.log(`[GoogleOAuth] Generated auth URL with domain restriction: ${this.allowedDomain}`)

    return [authUrl, state]
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
  }> {
    try {
      const tokenData = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenData).toString(),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[GoogleOAuth] Token exchange failed:', error)
        throw new Error('Failed to exchange code for token')
      }

      const tokenResponse = await response.json()
      console.log('[GoogleOAuth] Successfully exchanged code for access token')
      return tokenResponse
    } catch (error) {
      console.error('[GoogleOAuth] Token exchange error:', error)
      throw new Error(`OAuth token exchange failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get user information from Google using access token
   */
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch(this.userinfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[GoogleOAuth] Failed to fetch user info:', error)
        throw new Error('Failed to fetch user information')
      }

      const userInfo = await response.json()
      console.log(`[GoogleOAuth] Retrieved user info for: ${userInfo.email}`)
      return userInfo
    } catch (error) {
      console.error('[GoogleOAuth] User info fetch error:', error)
      throw new Error(`Failed to retrieve user information: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Validate that user's email domain is allowed
   */
  validateUserDomain(userInfo: any): boolean {
    const email = userInfo.email || ''

    if (!email) {
      console.warn('[GoogleOAuth] No email found in user info')
      return false
    }

    const emailDomain = email.split('@')[1] || ''
    const isValid = emailDomain.toLowerCase() === this.allowedDomain.toLowerCase()

    if (!isValid) {
      console.warn(
        `[GoogleOAuth] Domain validation failed. Email: ${email}, Required domain: ${this.allowedDomain}`
      )
    } else {
      console.log(`[GoogleOAuth] Domain validation successful for: ${email}`)
    }

    return isValid
  }

  /**
   * Create user profile from Google user info
   */
  createUserProfile(userInfo: any): UserProfile {
    return {
      email: userInfo.email || '',
      name: userInfo.name || '',
      givenName: userInfo.given_name || '',
      familyName: userInfo.family_name || '',
      picture: userInfo.picture || '',
      googleId: userInfo.id || '',
      verifiedEmail: userInfo.verified_email || false,
      domain: userInfo.hd || this.allowedDomain,
      role: this.determineUserRole(userInfo.email || ''),
      accessLevel: 'read',
    }
  }

  /**
   * Determine user role based on email
   */
  private determineUserRole(email: string): string {
    if (email.toLowerCase().includes('admin')) {
      return 'admin'
    } else if (email.toLowerCase().includes('manager') || email.toLowerCase().includes('lead')) {
      return 'manager'
    }
    return 'user'
  }

  /**
   * Complete the OAuth flow and return user profile
   */
  async completeOAuthFlow(code: string): Promise<UserProfile> {
    try {
      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(code)
      const accessToken = tokenResponse.access_token

      if (!accessToken) {
        throw new Error('No access token received')
      }

      // Get user information
      const userInfo = await this.getUserInfo(accessToken)

      // Validate domain
      if (!this.validateUserDomain(userInfo)) {
        throw new Error(`Access denied. Only ${this.allowedDomain} email addresses are allowed.`)
      }

      // Create user profile
      const userProfile = this.createUserProfile(userInfo)

      console.log(`[GoogleOAuth] OAuth flow completed successfully for: ${userProfile.email}`)
      return userProfile
    } catch (error) {
      console.error('[GoogleOAuth] OAuth flow error:', error)
      throw error
    }
  }
}

// Global instance
export const googleOAuthManager = new GoogleOAuthManager()
