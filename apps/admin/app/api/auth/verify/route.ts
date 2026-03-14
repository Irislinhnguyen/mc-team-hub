import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@query-stream-ai/auth/service'
import { isLeaderOrAbove } from '@query-stream-ai/auth/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL(`${process.env.NEXT_PUBLIC_WEB_URL || 'https://geniee-web.vercel.app'}/login?error=no_token`)
      )
    }

    // Verify token
    const payload = authService.verifyToken(token)

    if (!payload || !isLeaderOrAbove(payload)) {
      return NextResponse.redirect(
        new URL(`${process.env.NEXT_PUBLIC_WEB_URL || 'https://geniee-web.vercel.app'}/login?error=unauthorized`)
      )
    }

    // Set admin app's own cookie
    const cookieStore = await cookies()
    cookieStore.set('__Host-auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 // 8 hours
    })

    // Redirect to admin dashboard
    return NextResponse.redirect(new URL('/admin/ai-usage', request.url))
  } catch (error) {
    console.error('[Admin Auth] Error verifying token:', error)
    return NextResponse.redirect(
      new URL(`${process.env.NEXT_PUBLIC_WEB_URL || 'https://geniee-web.vercel.app'}/login?error=invalid_token`)
    )
  }
}
