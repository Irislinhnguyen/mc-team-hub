/**
 * Server-side Authentication Helpers
 * Use these utilities in API routes and Server Components
 */

import { cookies } from 'next/headers'
import { authService, TokenPayload } from '../services/auth'
import { redirect } from 'next/navigation'
import { ROLE_ASSIGNMENT_RULES, type UserRole } from '@/lib/types/rbac'

/**
 * Get the current authenticated user from JWT token (Server Components)
 * Returns null if not authenticated
 */
export async function getServerUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('__Host-auth_token')?.value

    if (!authToken) {
      return null
    }

    const payload = authService.verifyToken(authToken)
    return payload
  } catch (error) {
    console.error('[Auth] Error getting server user:', error)
    return null
  }
}

/**
 * Require authentication - redirect to /auth if not authenticated
 * Use in Server Components that require authentication
 */
export async function requireAuth(): Promise<TokenPayload> {
  const user = await getServerUser()

  if (!user) {
    redirect('/auth')
  }

  return user
}

/**
 * Get user from request (for API routes)
 * Returns null if not authenticated
 */
export function getUserFromRequest(request: Request): TokenPayload | null {
  try {
    // Extract token from cookie header
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return null
    }

    // Parse cookies manually
    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      },
      {} as Record<string, string>
    )

    const authToken = cookies['__Host-auth_token']
    if (!authToken) {
      return null
    }

    const payload = authService.verifyToken(authToken)
    return payload
  } catch (error) {
    console.error('[Auth] Error getting user from request:', error)
    return null
  }
}

/**
 * Require authentication in API routes
 * Throws an error if not authenticated
 */
export function requireAuthApi(request: Request): TokenPayload {
  const user = getUserFromRequest(request)

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Check if user has specific role
 */
export function hasRole(user: TokenPayload, role: string): boolean {
  return user.role === role
}

/**
 * Check if user is admin
 */
export function isAdmin(user: TokenPayload): boolean {
  return hasRole(user, 'admin')
}

/**
 * Check if user is manager
 */
export function isManager(user: TokenPayload): boolean {
  return hasRole(user, 'manager')
}

/**
 * Check if user is admin or manager
 */
export function isAdminOrManager(user: TokenPayload): boolean {
  return isAdmin(user) || isManager(user)
}

/**
 * Require admin role
 * Throws an error if user is not admin
 */
export function requireAdmin(user: TokenPayload): void {
  if (!isAdmin(user)) {
    throw new Error('Forbidden: Admin access required')
  }
}

/**
 * Require admin or manager role
 * Throws an error if user is neither admin nor manager
 */
export function requireAdminOrManager(user: TokenPayload): void {
  if (!isAdminOrManager(user)) {
    throw new Error('Forbidden: Admin or Manager access required')
  }
}

// =====================================================
// Leader Role Functions
// =====================================================

/**
 * Check if user is leader
 */
export function isLeader(user: TokenPayload): boolean {
  return hasRole(user, 'leader')
}

/**
 * Check if user is leader or above (leader/manager/admin)
 */
export function isLeaderOrAbove(user: TokenPayload): boolean {
  return isLeader(user) || isManager(user) || isAdmin(user)
}

/**
 * Require leader or above role
 * Throws an error if user is below leader level
 */
export function requireLeaderOrAbove(user: TokenPayload): void {
  if (!isLeaderOrAbove(user)) {
    throw new Error('Forbidden: Leader or higher access required')
  }
}

// =====================================================
// Focus of the Month Permission Functions
// =====================================================

/**
 * Check if user can manage Focus of the Month (create/edit/publish)
 * Equivalent to: isLeaderOrAbove(user)
 */
export function canManageFocus(user: TokenPayload): boolean {
  return isLeaderOrAbove(user)
}

/**
 * Require Focus management permission
 */
export function requireFocusManage(user: TokenPayload): void {
  if (!canManageFocus(user)) {
    throw new Error('Forbidden: Focus management access required')
  }
}

// =====================================================
// Role Assignment Functions
// =====================================================

/**
 * Check if assigner role can assign target role
 *
 * Rules:
 * - admin can assign: admin, manager, leader, user
 * - manager can assign: manager, leader, user
 * - leader can assign: user only
 * - user cannot assign any roles
 */
export function canAssignRole(assignerRole: string, targetRole: string): boolean {
  const assignableRoles = ROLE_ASSIGNMENT_RULES[assignerRole as UserRole] || []
  return assignableRoles.includes(targetRole as UserRole)
}

/**
 * Get roles that the given role can assign to others
 */
export function getAssignableRoles(userRole: string): UserRole[] {
  return ROLE_ASSIGNMENT_RULES[userRole as UserRole] || []
}

/**
 * Validate and require that assigner can assign target role
 * Throws an error if not allowed
 */
export function requireCanAssignRole(assignerRole: string, targetRole: string): void {
  if (!canAssignRole(assignerRole, targetRole)) {
    throw new Error(`Forbidden: You cannot assign ${targetRole} role`)
  }
}
