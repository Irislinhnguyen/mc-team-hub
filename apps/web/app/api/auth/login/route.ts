/**
 * Google OAuth Login Endpoint
 * Redirects to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server'
import { googleOAuthManager } from '../../../../lib/services/google-oauth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const [authUrl, state] = googleOAuthManager.getAuthorizationUrl()

    // Store state in cookie for CSRF protection
    const cookieStore = await cookies()
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    })

    // Preserve return_url cookie if it exists (set by middleware)
    const returnUrl = cookieStore.get('return_url')?.value
    if (returnUrl) {
      console.log('[API] Preserving return_url for OAuth flow:', returnUrl)
      // Cookie already exists, just log it - it will be preserved across redirects
    }

    console.log('[API] Redirecting to Google OAuth')
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[API] Login error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    )
  }
}
