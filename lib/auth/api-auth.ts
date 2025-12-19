/**
 * API Authentication Helper
 * Handles custom JWT authentication for API routes
 * Pattern: Extract JWT from cookie → Parse payload → Query user by email
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AuthResult {
  success: boolean
  userId?: string
  userEmail?: string
  error?: string
}

/**
 * Authenticates API request using custom JWT token from __Host-auth_token cookie
 *
 * @param request - Next.js request object
 * @returns AuthResult with userId and userEmail if successful
 *
 * @example
 * const auth = await authenticateRequest(request)
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 })
 * }
 * // Use auth.userId to filter data
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // 1. Extract custom JWT token from cookie
  const authToken = request.cookies.get('__Host-auth_token')?.value

  if (!authToken) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Parse JWT payload to get user email
  let userEmail: string
  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]))
    userEmail = payload.sub || payload.email

    if (!userEmail) {
      return { success: false, error: 'Invalid token payload' }
    }
  } catch (error) {
    console.error('[API Auth] Failed to parse JWT:', error)
    return { success: false, error: 'Invalid token' }
  }

  // 3. Get user from database using admin client
  const supabase = createAdminClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', userEmail)
    .single()

  if (error || !user) {
    console.error('[API Auth] User not found:', userEmail, error)
    return { success: false, error: 'User not found' }
  }

  return {
    success: true,
    userId: user.id,
    userEmail: user.email,
  }
}
