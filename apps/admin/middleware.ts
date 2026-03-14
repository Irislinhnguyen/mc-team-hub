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
  const user = await getServerUser()

  if (!user) {
    // Redirect to local login page instead of web app
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check if user has leader+ role
  if (!isLeaderOrAbove(user)) {
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
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
