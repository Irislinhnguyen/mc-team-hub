/**
 * Logout Endpoint
 * Clears authentication cookies and redirects to login
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Logout] Logging out user')

    const response = NextResponse.redirect(new URL('/auth', request.url))

    // Clear authentication cookies
    response.cookies.delete('auth_token')
    response.cookies.delete('supabase-auth-token')

    console.log('[Logout] User logged out successfully')
    return response
  } catch (error) {
    console.error('[Logout] Error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
