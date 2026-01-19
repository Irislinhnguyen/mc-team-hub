'use client'

import { useState, useEffect } from 'react'
import { Users, RefreshCw, ChevronLeft, ChevronRight, Search, Pencil, Trash2, Plus, X, Shield, UserCheck, User } from 'lucide-react'
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
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface User {
  id: string
  email: string
  name?: string
  role: 'admin' | 'manager' | 'leader' | 'user'
  created_at: string
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type RoleFilter = 'all' | 'admin' | 'manager' | 'leader' | 'user'

const ROLES = ['admin', 'manager', 'leader', 'user'] as const

interface RoleStats {
  admin: number
  manager: number
  leader: number
  user: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<RoleStats>({ admin: 0, manager: 0, leader: 0, user: 0 })

  // Edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<User['role']>('user')
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<User['role']>('user')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (roleFilter !== 'all') {
        params.set('role', roleFilter)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/admin/users?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('[Users Page] Failed to fetch stats:', err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [roleFilter, page])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsers()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-[#1565C0] text-white hover:bg-[#1565C0]">
            <Shield size={12} className="mr-1" />
            Admin
          </Badge>
        )
      case 'manager':
        return (
          <Badge className="bg-purple-500 text-white hover:bg-purple-500">
            <UserCheck size={12} className="mr-1" />
            Manager
          </Badge>
        )
      case 'leader':
        return (
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            <Users size={12} className="mr-1" />
            Leader
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-500 text-white hover:bg-gray-500">
            <User size={12} className="mr-1" />
            User
          </Badge>
        )
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setEditName(user.name || '')
    setEditRole(user.role)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, role: editRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user')
      }

      setEditingUser(null)
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      setDeletingUser(null)
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleCreate = async () => {
    if (!newEmail || !newPassword) {
      setError('Email and password are required')
      return
    }
    setCreating(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
          password: newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user')
      }

      setShowCreateModal(false)
      setNewEmail('')
      setNewName('')
      setNewRole('user')
      setNewPassword('')
      fetchUsers()
      fetchStats()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Roles</h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts and their roles
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#1565C0] hover:bg-[#0D47A1]"
        >
          <Plus size={16} className="mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-[#1565C0]/20 bg-[#1565C0]/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#1565C0]">{stats.admin}</div>
            <p className="text-sm text-[#1565C0]/70">Admins</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-700">{stats.manager}</div>
            <p className="text-sm text-purple-600">Managers</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-700">{stats.leader}</div>
            <p className="text-sm text-amber-600">Leaders</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-700">{stats.user}</div>
            <p className="text-sm text-gray-600">Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-gray-200">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(['all', ...ROLES] as RoleFilter[]).map((role) => (
                <Button
                  key={role}
                  variant={roleFilter === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setRoleFilter(role)
                    setPage(1)
                  }}
                  className={roleFilter === role ? 'bg-[#1565C0] hover:bg-[#0D47A1]' : ''}
                >
                  {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users size={48} className="mb-4 text-gray-300" />
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>User</TableHead>
                  <TableHead className="w-[120px]">Role</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{user.name || 'Unnamed'}</span>
                        <span className="text-sm text-gray-500">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil size={14} />
                        </Button>
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingUser(user)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingUser?.email || ''} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="User name"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={editRole === role ? 'default' : 'outline'}
                    onClick={() => setEditRole(role)}
                    className={editRole === role ? 'bg-[#1565C0] hover:bg-[#0D47A1]' : ''}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-[#1565C0] hover:bg-[#0D47A1]"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.name || deletingUser?.email}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="User name"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={newRole === role ? 'default' : 'outline'}
                    onClick={() => setNewRole(role)}
                    className={newRole === role ? 'bg-[#1565C0] hover:bg-[#0D47A1]' : ''}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newEmail || !newPassword}
              className="bg-[#1565C0] hover:bg-[#0D47A1]"
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
