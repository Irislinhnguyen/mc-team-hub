/**
 * CSRF Token Endpoint
 *
 * GET /api/auth/csrf
 * Returns a CSRF token for the client to use in subsequent requests
 */

import { NextRequest } from 'next/server'
import { getCsrfTokenHandler } from '../../../../lib/middleware/csrf'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return getCsrfTokenHandler(request)
}
