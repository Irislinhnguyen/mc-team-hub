/**
 * RBAC (Role-Based Access Control) Type Definitions
 *
 * Centralized types for the unified permission system
 */

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'manager' | 'leader' | 'user'

/**
 * Permission resources (features that can be permissioned)
 */
export type PermissionResource =
  | 'focus_of_month'
  | 'pipelines'
  | 'business_health'
  | 'team_settings'
  | 'analytics'

/**
 * Permission actions (what can be done on a resource)
 */
export type PermissionAction =
  | 'view'
  | 'view_draft'
  | 'create'
  | 'update'
  | 'publish'
  | 'delete'
  | 'export'
  | 'manage_roles'

/**
 * Role hierarchy level (higher = more permissions)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  manager: 3,
  leader: 2,
  user: 1,
}

/**
 * Role assignment rules
 * Defines which roles each role can assign to other users
 *
 * Rules:
 * - admin can assign: admin, manager, leader, user
 * - manager can assign: manager, leader, user (but not admin)
 * - leader can assign: user only
 * - user cannot assign any roles
 */
export const ROLE_ASSIGNMENT_RULES: Record<UserRole, UserRole[]> = {
  admin: ['admin', 'manager', 'leader', 'user'],
  manager: ['manager', 'leader', 'user'],
  leader: ['user'],
  user: [],
}

/**
 * Display names for roles
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  leader: 'Leader',
  user: 'User',
}

/**
 * Role badge colors for UI
 */
export const ROLE_BADGE_COLORS: Record<UserRole, { bg: string; text: string; icon: string }> = {
  admin: { bg: 'bg-[#1565C0]', text: 'text-white', icon: 'Shield' },
  manager: { bg: 'bg-purple-500', text: 'text-white', icon: 'UserCheck' },
  leader: { bg: 'bg-amber-500', text: 'text-white', icon: 'Users' },
  user: { bg: 'bg-gray-500', text: 'text-white', icon: 'User' },
}

/**
 * Focus of the Month permission matrix
 */
export const FOCUS_PERMISSION_MATRIX: Record<UserRole, string[]> = {
  admin: ['focus.view', 'focus.view_draft', 'focus.create', 'focus.update', 'focus.publish', 'focus.delete'],
  manager: ['focus.view', 'focus.view_draft', 'focus.create', 'focus.update', 'focus.publish'],
  leader: ['focus.view', 'focus.view_draft', 'focus.create', 'focus.update', 'focus.publish'],
  user: ['focus.view'],
}

/**
 * Check if a role can assign another role
 */
export function canRoleAssign(assignerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_ASSIGNMENT_RULES[assignerRole].includes(targetRole)
}

/**
 * Get roles that a given role can assign
 */
export function getAssignableRoles(role: UserRole): UserRole[] {
  return ROLE_ASSIGNMENT_RULES[role] || []
}

/**
 * Check if role is at least the specified level
 */
export function isRoleAtOrAbove(role: UserRole, minLevel: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minLevel]
}

/**
 * Check if role is leader or above
 */
export function isLeaderOrAbove(role: UserRole): boolean {
  return isRoleAtOrAbove(role, 'leader')
}

/**
 * Check if role is manager or above
 */
export function isManagerOrAbove(role: UserRole): boolean {
  return isRoleAtOrAbove(role, 'manager')
}
