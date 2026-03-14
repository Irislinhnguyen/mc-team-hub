/**
 * Google OAuth Callback Handler
 * Handles the OAuth redirect from Google
 */

import { NextRequest, NextResponse } from 'next/server'
import { googleOAuthManager } from '../../../../lib/services/google-oauth'
import { authService } from '../../../../lib/services/auth'
import { createAdminClient } from '../../../../lib/supabase/admin'
import type { UserInsert } from '../../../../lib/supabase/database.types'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get authorization code and state from query parameters
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      console.error('[OAuth Callback] No authorization code received')
      return NextResponse.json(
        { error: 'Authorization code not found' },
        { status: 400 }
      )
    }

    // Verify CSRF state
    const cookieStore = await cookies()
    const storedState = cookieStore.get('oauth_state')?.value

    if (!storedState || storedState !== state) {
      console.error('[OAuth Callback] CSRF validation failed')
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    // Exchange code for user profile
    const userProfile = await googleOAuthManager.completeOAuthFlow(code)

    console.log(`[OAuth Callback] OAuth flow completed for: ${userProfile.email}`)

    // Store user in Supabase database
    const supabase = createAdminClient()

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', userProfile.email)
      .single() as any

    if (!existingUser) {
      // Create new user
      const newUser: UserInsert = {
        email: userProfile.email,
        name: userProfile.name || userProfile.email.split('@')[0],
        role: (userProfile.role || 'user') as 'admin' | 'manager' | 'user',
        auth_method: 'google',
        password_hash: null,
      }

      // Workaround for Supabase TypeScript types issue
      const { error: insertError } = await (supabase.from('users') as any).insert(newUser)

      if (insertError) {
        console.error('[OAuth Callback] Error creating user:', insertError)
        throw new Error('Failed to create user account')
      }

      console.log('[OAuth Callback] New user created:', userProfile.email)
    } else {
      // Update existing user's last login (via updated_at trigger)
      await (supabase
        .from('users') as any)
        .update({ name: userProfile.name || (existingUser as any).name })
        .eq('email', userProfile.email)

      console.log('[OAuth Callback] Existing user logged in:', userProfile.email)
    }

    // Create JWT token
    const token = authService.registerOAuthUser({
      email: userProfile.email,
      name: userProfile.name,
      role: userProfile.role,
      accessLevel: userProfile.accessLevel,
    })

    // Get return URL from cookie (set by middleware)
    const returnUrl = cookieStore.get('return_url')?.value || '/'

    console.log('[OAuth Callback] All cookies:', {
      oauth_state: cookieStore.get('oauth_state')?.value,
      return_url: cookieStore.get('return_url')?.value,
      auth_token: cookieStore.get('auth_token')?.value,
    })
    console.log('[OAuth Callback] Redirecting to:', returnUrl)

    // Set token in cookie and redirect to original URL
    const response = NextResponse.redirect(new URL(returnUrl, request.url))

    // Use __Host- prefix for enhanced security
    // __Host- prefix requires: secure=true, path='/', no domain attribute
    response.cookies.set('__Host-auth_token', token, {
      httpOnly: true,
      secure: true, // Always enforce HTTPS
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better OAuth compatibility
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    })

    // Clear OAuth state cookie and return URL cookie
    response.cookies.delete('oauth_state')
    response.cookies.delete('return_url')

    console.log(`[OAuth Callback] User authenticated and redirected to: ${returnUrl}`)
    return response
  } catch (error) {
    console.error('[OAuth Callback] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const response = NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(errorMessage)}`, request.url)
    )

    return response
  }
}
