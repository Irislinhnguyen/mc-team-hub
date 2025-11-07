/**
 * CSRF Protection Middleware
 *
 * Protects against Cross-Site Request Forgery attacks
 * Uses double-submit cookie pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const CSRF_TOKEN_COOKIE = 'csrf_token'
const CSRF_TOKEN_HEADER = 'x-csrf-token'

/**
 * Generate a random CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify CSRF token from request
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  const tokenFromHeader = request.headers.get(CSRF_TOKEN_HEADER)
  const tokenFromCookie = request.cookies.get(CSRF_TOKEN_COOKIE)?.value

  if (!tokenFromHeader || !tokenFromCookie) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(tokenFromHeader),
    Buffer.from(tokenFromCookie)
  )
}

/**
 * Middleware wrapper for CSRF protection
 * Only applies to state-changing methods (POST, PUT, DELETE, PATCH)
 */
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const method = request.method

    // Only check CSRF for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // Skip CSRF check for authentication endpoints (they have other protections)
      const path = request.nextUrl.pathname
      const authPaths = ['/api/auth/login', '/api/auth/callback', '/api/auth/login-password']

      if (!authPaths.some(p => path.startsWith(p))) {
        if (!verifyCsrfToken(request)) {
          return NextResponse.json(
            { error: 'CSRF token validation failed' },
            { status: 403 }
          )
        }
      }
    }

    return handler(request)
  }
}

/**
 * API endpoint to get CSRF token
 * Frontend should call this on mount and include token in subsequent requests
 */
export async function getCsrfTokenHandler(request: NextRequest): Promise<Response> {
  // Check if token already exists in cookie
  let token = request.cookies.get(CSRF_TOKEN_COOKIE)?.value

  // Generate new token if doesn't exist
  if (!token) {
    token = generateCsrfToken()
  }

  const response = NextResponse.json({ csrfToken: token })

  // Set token in cookie
  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  })

  return response
}

/**
 * Helper to add CSRF token to response cookies
 * Useful when you want to set a new token during other operations
 */
export function setCsrfTokenCookie(response: NextResponse): void {
  const token = generateCsrfToken()

  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  })
}
