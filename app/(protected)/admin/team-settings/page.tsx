/**
 * Team Settings Page
 *
 * Admin and Manager only - for managing team member roles
 *
 * Role assignment hierarchy:
 * - Admin can assign: admin, manager, leader, user
 * - Manager can assign: manager, leader, user
 * - Leader does NOT have access to this page
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Shield } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { TeamSettings } from '@/app/components/team/TeamSettings'
import type { UserRole } from '@/lib/types/rbac'

export default function TeamSettingsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'admin' && user.role !== 'manager'))) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null
  }

  const currentUserRole = user.role as UserRole

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#1565C0]/10 rounded-lg">
            <Users className="h-6 w-6 text-[#1565C0]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Settings</h1>
            <p className="text-sm text-gray-500">Manage team member roles and permissions</p>
          </div>
        </div>
      </div>

      {/* Info about role hierarchy */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-[#1565C0] mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Role Assignment Hierarchy</p>
            <ul className="text-blue-800 space-y-1">
              {currentUserRole === 'admin' ? (
                <>
                  <li>• <strong>Admin</strong> can assign: Admin, Manager, Leader, User</li>
                  <li>• <strong>Manager</strong> can assign: Manager, Leader, User</li>
                  <li>• <strong>Leader</strong> can assign: User only (via other pages)</li>
                </>
              ) : (
                <>
                  <li>• <strong>Manager</strong> can assign: Manager, Leader, User</li>
                  <li>• <strong>Leader</strong> can assign: User only (via other pages)</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Team Settings Component */}
      <TeamSettings
        currentUserRole={currentUserRole}
        onRoleChange={(userId, newRole) => {
          console.log(`User ${userId} role changed to ${newRole}`)
        }}
      />
    </div>
  )
}
