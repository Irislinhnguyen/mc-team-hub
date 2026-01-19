/**
 * RBAC Service
 *
 * Service layer for Role-Based Access Control operations.
 * Provides permission checking and user permission management.
 */

import { createClient } from '@/lib/supabase/server'
import type { Permission, UserRole } from '@/lib/types/rbac'

export interface PermissionCheckResult {
  granted: boolean
  reason?: string
}

export interface UserPermissions {
  userId: string
  role: UserRole
  permissions: Permission[]
}

/**
 * RBAC Service class
 */
export class RBACService {
  /**
   * Check if user has a specific permission
   *
   * @param userId - User ID to check
   * @param resource - Resource name (e.g., 'focus_of_month')
   * @param action - Action name (e.g., 'create', 'view')
   * @returns Permission check result
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<PermissionCheckResult> {
    try {
      const supabase = await createClient()

      // Get user's role
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return { granted: false, reason: 'User not found' }
      }

      // Admins have all permissions
      if (user.role === 'admin') {
        return { granted: true }
      }

      // Use the database function for permission check
      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: userId,
        p_resource: resource,
        p_action: action,
      })

      if (error) {
        console.error('[RBAC] Error checking permission:', error)
        return { granted: false, reason: 'Permission check failed' }
      }

      return { granted: data === true }
    } catch (error) {
      console.error('[RBAC] Exception checking permission:', error)
      return { granted: false, reason: 'Internal error' }
    }
  }

  /**
   * Check if user can manage Focus of the Month
   * (has 'create' permission on 'focus_of_month' resource)
   *
   * @param userId - User ID to check
   * @returns True if user can manage Focus of the Month
   */
  async canManageFocus(userId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Get user's role
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      // Leader, Manager, Admin can manage Focus
      return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'leader'
    } catch {
      return false
    }
  }

  /**
   * Get all permissions for a user
   *
   * @param userId - User ID
   * @returns User permissions list
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const supabase = await createClient()

      // Get user's role
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (!user) return []

      // Admin gets all permissions
      if (user.role === 'admin') {
        const { data: allPermissions } = await supabase
          .from('permissions')
          .select('*')
        return allPermissions || []
      }

      // Use database function to get user permissions
      const { data } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
      })

      if (!data) return []

      // Transform database result to Permission type
      return (data as any[]).map((row: any) => ({
        id: row.permission_name || '',
        name: row.permission_name || '',
        resource: row.resource || '',
        action: row.action || '',
        description: row.description || null,
        created_at: new Date().toISOString(),
      }))
    } catch (error) {
      console.error('[RBAC] Error getting user permissions:', error)
      return []
    }
  }

  /**
   * Get user with their role and permissions
   *
   * @param userId - User ID
   * @returns User with permissions
   */
  async getUserWithPermissions(userId: string): Promise<UserPermissions | null> {
    try {
      const supabase = await createClient()

      const { data: user } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', userId)
        .single()

      if (!user) return null

      const permissions = await this.getUserPermissions(userId)

      return {
        userId: user.id,
        role: user.role as UserRole,
        permissions,
      }
    } catch (error) {
      console.error('[RBAC] Error getting user with permissions:', error)
      return null
    }
  }

  /**
   * Grant a permission to a user (override)
   *
   * @param userId - User to grant permission to
   * @param permissionId - Permission ID to grant
   * @param grantedBy - User ID granting the permission
   * @param expiresAt - Optional expiration date
   */
  async grantPermission(
    userId: string,
    permissionId: string,
    grantedBy: string | null = null,
    expiresAt: Date | null = null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted: true,
          granted_by: grantedBy,
          expires_at: expiresAt?.toISOString() || null,
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }

  /**
   * Revoke a permission from a user (override)
   *
   * @param userId - User to revoke permission from
   * @param permissionId - Permission ID to revoke
   */
  async revokePermission(
    userId: string,
    permissionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted: false,
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }

  /**
   * Clear user permission override (remove and fall back to role permissions)
   *
   * @param userId - User ID
   * @param permissionId - Permission ID to clear
   */
  async clearPermissionOverride(
    userId: string,
    permissionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('permission_id', permissionId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }
}

// Singleton instance
export const rbacService = new RBACService()
