import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authService } from '../../../../lib/services/auth'
import { withRateLimit, RateLimitPresets } from '../../../../lib/middleware/rateLimit'
import { loginPasswordSchema, validateRequest } from '../../../../lib/validation/schemas'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/login-password
 * Admin login with email and password
 * Rate limited to prevent brute force attacks
 */
async function handler(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod schema
    const { email, password } = validateRequest(loginPasswordSchema, body)

    // Attempt login
    const result = await authService.loginWithPassword(email, password)

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const { user, token } = result

    // Read return URL from cookie (set by middleware)
    const cookieStore = await cookies()
    const returnUrl = cookieStore.get('return_url')?.value || '/'

    console.log('[API] Password login successful:', email)
    console.log('[API] Redirecting to:', returnUrl)

    // Create redirect response instead of JSON
    const response = NextResponse.redirect(new URL(returnUrl, request.url))

    // Set auth token cookie with __Host- prefix for enhanced security
    response.cookies.set('__Host-auth_token', token, {
      httpOnly: true,
      secure: true, // Always enforce HTTPS
      sameSite: 'strict', // Upgraded from 'lax' to 'strict'
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    })

    // Clean up return URL cookie
    response.cookies.delete('return_url')

    return response
  } catch (error) {
    console.error('[API] Error in password login:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}

// Export with rate limiting protection
export const POST = withRateLimit(handler, RateLimitPresets.auth)
