/**
 * Next.js Middleware
 * Handles authentication and session management
 *
 * Note: Middleware runs in Edge Runtime, so we keep it simple.
 * We only check for auth_token cookie presence here.
 * Full JWT verification happens in API routes and server components.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname

  // Public routes (no auth required)
  const publicRoutes = ['/auth', '/api/auth/callback', '/api/auth/login', '/api/auth/login-password']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Protected routes (auth required) - all except auth routes
  const protectedRoutes = ['/analytics', '/performance-tracker']
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Skip auth check for public routes, but redirect authenticated users away from /auth
  if (isPublicRoute) {
    // If user is already authenticated and trying to access /auth, redirect to home
    if (pathname === '/auth' || pathname.startsWith('/auth')) {
      const authToken = request.cookies.get('__Host-auth_token')?.value
      if (authToken) {
        console.log('[Middleware] User already authenticated, redirecting from /auth to home')
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    return NextResponse.next()
  }

  // Homepage - requires auth but no redirect
  if (pathname === '/') {
    const authToken = request.cookies.get('__Host-auth_token')?.value
    if (!authToken) {
      console.log('[Middleware] No auth token for homepage, redirecting to /auth')
      return NextResponse.redirect(new URL('/auth', request.url))
    }
    return NextResponse.next()
  }

  // Check authentication for protected routes
  // We only check for cookie presence in middleware (Edge Runtime limitation)
  // Full JWT verification happens in API routes and components
  if (isProtectedRoute) {
    const authToken = request.cookies.get('__Host-auth_token')?.value

    if (!authToken) {
      console.log('[Middleware] No auth token found, redirecting to /auth')

      // Save the original URL (including query params) for redirect after login
      const returnUrl = request.nextUrl.pathname + request.nextUrl.search

      // Redirect to /auth with returnUrl as query param (for client-side)
      // and also store in cookie (for server-side OAuth callback)
      const authUrl = new URL('/auth', request.url)
      authUrl.searchParams.set('returnUrl', returnUrl)

      const response = NextResponse.redirect(authUrl)

      // Store return URL in cookie (for OAuth callback)
      response.cookies.set('return_url', returnUrl, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60, // 10 minutes
      })

      return response
    }

    // Cookie exists, allow access
    console.log('[Middleware] Auth token present, allowing access')
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
