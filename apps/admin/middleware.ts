import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@query-stream-ai/auth/server'
import { isLeaderOrAbove } from '@query-stream-ai/auth/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow login page and auth API routes through
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Allow public routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next()
  }

  // Check authentication for all other routes
  console.log('[Middleware] Checking auth for:', pathname)
  const user = await getServerUser()
  console.log('[Middleware] User result:', user ? user.email : 'null')

  if (!user) {
    // Redirect to local login page instead of web app
    console.log('[Middleware] No user found, redirecting to /login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check if user has leader+ role
  if (!isLeaderOrAbove(user)) {
    console.log('[Middleware] User not authorized, redirecting to /login')
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  console.log('[Middleware] User authorized, proceeding to:', pathname)
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
  // Use Node.js runtime instead of Edge Runtime for crypto module support
  runtime: 'nodejs',
}
