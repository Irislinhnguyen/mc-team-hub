/**
 * Logout Endpoint
 * Clears authentication cookies and redirects to login
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Logout] Logging out user (GET)')

    const response = NextResponse.redirect(new URL('/auth', request.url))

    // Clear authentication cookies
    response.cookies.delete('__Host-auth_token')
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

export async function POST(request: NextRequest) {
  try {
    console.log('[Logout] Logging out user (POST)')

    const response = NextResponse.json({ success: true })

    // Clear authentication cookies
    response.cookies.delete('__Host-auth_token')
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
