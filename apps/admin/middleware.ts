import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { isLeaderOrAbove } from '@query-stream-ai/auth/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow auth/verify route through
  if (pathname.startsWith('/api/auth/verify')) {
    return NextResponse.next()
  }

  // Allow public routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }

  // Check authentication for all other routes
  const user = await getServerUser()

  if (!user) {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://geniee-web.vercel.app'
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://geniee-admin.vercel.app'
    return NextResponse.redirect(new URL(`${webUrl}/auth?returnUrl=${adminUrl}`, request.url))
  }

  // Check if user has leader+ role
  if (!isLeaderOrAbove(user)) {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://geniee-web.vercel.app'
    return NextResponse.redirect(new URL(`${webUrl}/?error=unauthorized`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
