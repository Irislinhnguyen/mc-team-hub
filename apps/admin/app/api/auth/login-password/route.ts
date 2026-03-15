import { NextRequest, NextResponse } from 'next/server'
import { authService } from '../../../../lib/services/auth'
import { withRateLimit, RateLimitPresets } from '../../../../lib/middleware/rateLimit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/login-password
 * Admin login with email and password
 * Rate limited to prevent brute force attacks
 */
async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Attempt login
    const result = await authService.loginWithPassword(email, password)

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const { user, token } = result

    console.log('[API] Admin password login successful:', email)

    // Create redirect to admin dashboard
    const response = NextResponse.redirect(new URL('/admin', request.url))

    // Set auth token cookie (use simple name for compatibility)
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    })

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
