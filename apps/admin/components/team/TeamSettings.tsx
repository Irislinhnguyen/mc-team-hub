'use client'

import type { UserRole } from '@query-stream-ai/types/rbac'

interface TeamSettingsProps {
  currentUserRole: UserRole
  onRoleChange: (userId: string, newRole: string) => void
}

export function TeamSettings({ currentUserRole, onRoleChange }: TeamSettingsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <p className="text-gray-500">Team settings functionality will be implemented here.</p>
    </div>
  )
}
