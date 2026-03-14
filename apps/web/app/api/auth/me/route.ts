import { NextRequest, NextResponse } from 'next/server'
import { authService } from '../../../../lib/services/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 * Get current authenticated user from JWT token
 */
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('__Host-auth_token')?.value

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify and decode token
    const payload = authService.verifyToken(authToken)

    // Return user data
    return NextResponse.json({
      user: {
        email: payload.email || payload.sub,
        name: payload.name,
        role: payload.role,
        accessLevel: payload.access_level,
        authType: payload.auth_type,
      },
    })
  } catch (error) {
    console.error('[API] Error in /api/auth/me:', error)

    // Token is invalid or expired
    if (error instanceof Error && error.message.includes('expired')) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}
