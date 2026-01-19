/**
 * Team Settings Component
 *
 * Reusable component for managing team member roles.
 * Can be used in Business Health, Pipelines, or other pages.
 *
 * Role assignment hierarchy:
 * - Admin can assign: admin, manager, leader, user
 * - Manager can assign: manager, leader, user
 * - Leader can assign: user only
 * - User cannot assign any roles
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, UserCheck, Users, User, Search, RefreshCw } from 'lucide-react'
import { getAssignableRoles, ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS, type UserRole } from '@/lib/types/rbac'

export interface TeamMember {
  id: string
  email: string
  name: string | null
  role: UserRole
  created_at: string
}

export interface TeamSettingsProps {
  /**
   * Current user's role - determines what roles they can assign
   */
  currentUserRole: UserRole

  /**
   * Optional callback when role is changed
   */
  onRoleChange?: (userId: string, newRole: UserRole) => void

  /**
   * Optional team filter to show only specific team members
   */
  teamFilter?: string

  /**
   * Compact mode for smaller displays
   */
  compact?: boolean

  /**
   * Hide stats cards
   */
  hideStats?: boolean

  /**
   * Hide filters
   */
  hideFilters?: boolean
}

export function TeamSettings({
  currentUserRole,
  onRoleChange,
  teamFilter,
  compact = false,
  hideStats = false,
  hideFilters = false,
}: TeamSettingsProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // Get roles that current user can assign based on hierarchy
  const assignableRoles = getAssignableRoles(currentUserRole)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: '100',
      })
      if (teamFilter) params.set('team', teamFilter)

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }

      const data = await response.json()
      setMembers(data.users || [])
    } catch (err: any) {
      console.error('Failed to fetch team members:', err)
      setError(err.message || 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [teamFilter])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update role')
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
      )

      onRoleChange?.(userId, newRole)
    } catch (err: any) {
      console.error('Failed to update role:', err)
      setError(err.message)
      // Refresh to get correct state
      fetchMembers()
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Stats by role
  const stats = {
    admin: members.filter((m) => m.role === 'admin').length,
    manager: members.filter((m) => m.role === 'manager').length,
    leader: members.filter((m) => m.role === 'leader').length,
    user: members.filter((m) => m.role === 'user').length,
  }

  // Get role badge component
  const getRoleBadge = (role: UserRole) => {
    const colors = ROLE_BADGE_COLORS[role]
    const iconName = colors.icon

    const Icon = iconName === 'Shield' ? Shield : iconName === 'UserCheck' ? UserCheck : iconName === 'Users' ? Users : User

    return (
      <Badge className={`${colors.bg} ${colors.text} hover:opacity-80`}>
        <Icon size={12} className="mr-1" />
        {ROLE_DISPLAY_NAMES[role]}
      </Badge>
    )
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{member.name || 'Unnamed'}</span>
                <span className="text-xs text-gray-500">{member.email}</span>
              </div>
              {getRoleBadge(member.role)}
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Team Settings</h3>
          <p className="text-sm text-gray-500">Manage team member roles</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMembers}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {!hideStats && (
        <div className="grid grid-cols-4 gap-2">
          {(['admin', 'manager', 'leader', 'user'] as UserRole[]).map((role) => {
            const colors = ROLE_BADGE_COLORS[role]
            return (
              <div
                key={role}
                className={`border ${colors.bg.replace('bg-', 'border-').replace('text-', '').replace('500', '200')} ${colors.bg.replace('500', '50')} rounded-lg p-3 text-center`}
              >
                <div className="text-xl font-bold text-gray-900">{stats[role]}</div>
                <div className="text-xs text-gray-600">{ROLE_DISPLAY_NAMES[role]}s</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      {!hideFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="leader">Leader</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Info about permissions */}
      {assignableRoles.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">
          You don't have permission to assign roles. Contact your admin or manager.
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No team members found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Member</TableHead>
                <TableHead className="w-[140px]">Role</TableHead>
                <TableHead className="w-[120px]">Joined</TableHead>
                {assignableRoles.length > 0 && <TableHead className="w-[150px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{member.name || 'Unnamed'}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(member.created_at)}</TableCell>
                  {assignableRoles.length > 0 && (
                    <TableCell>
                      {assignableRoles.includes(member.role) ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleRoleChange(member.id, newRole as UserRole)}
                          disabled={updatingUserId === member.id}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_DISPLAY_NAMES[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {currentUserRole === 'user' ? 'No permission' : 'Cannot modify'}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
