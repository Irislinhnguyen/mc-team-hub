import { NextRequest, NextResponse } from 'next/server'
import { authService, TokenPayload } from '@/lib/services/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/refresh
 * Refresh JWT token with latest user data from database
 *
 * This endpoint:
 * 1. Gets current user from JWT token
 * 2. Fetches fresh user data from database
 * 3. Re-issues JWT token with updated data
 * 4. Sets new cookie and returns updated user object
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('__Host-auth_token')?.value

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify current token to get user email
    let payload: TokenPayload
    try {
      payload = authService.verifyToken(authToken)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const email = payload.email || payload.sub
    if (!email) {
      return NextResponse.json(
        { error: 'Invalid token: missing email' },
        { status: 401 }
      )
    }

    // Refresh token with latest database data
    const result = await authService.refreshAccessToken(email)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 500 }
      )
    }

    // Set new cookie with refreshed token
    const response = NextResponse.json({
      status: 'ok',
      user: result.user,
      refreshed: true,
    })

    // Set new auth token cookie
    response.cookies.set('__Host-auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    })

    return response
  } catch (error) {
    console.error('[API] Error in /api/auth/refresh:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
