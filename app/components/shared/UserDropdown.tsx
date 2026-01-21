/**
 * Shared User Dropdown Component
 *
 * Used across all pages for consistent user menu:
 * - Header (align="end")
 * - Analytics Sidebar (align="start")
 * - Pipelines Sidebar (align="start")
 * - QueryLab Sidebar (align="start")
 * - GCPP Check Sidebar (compact mode - static style)
 *
 * Menu items (Admin/Manager only):
 * - Dashboard
 * - Team Settings
 * - Logout (all users)
 */

'use client'

import { useState } from 'react'
import { Shield, Users, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import type { UserRole } from '@/lib/types/rbac'

export interface User {
  name?: string
  email: string
  role: UserRole
}

export interface UserDropdownProps {
  user: User
  onLogout: () => void
  onRefreshSession?: () => Promise<void>
  /** Menu alignment - 'end' for header, 'start' for sidebar */
  align?: 'start' | 'end'
  /** Show upward chevron for sidebar */
  showUpChevron?: boolean
  /** Compact mode - static style without dropdown (for GCPP Check) */
  compact?: boolean
}

/**
 * Get role badge color and label
 */
function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'admin':
      return {
        badge: (
          <Badge className="text-xs px-1.5 py-0 bg-[#1565C0] hover:bg-[#0D47A1]">
            Admin
          </Badge>
        ),
        avatarBg: 'bg-[#1565C0]/10',
        avatarColor: 'text-[#1565C0]',
        icon: <Shield className="h-4 w-4" />,
      }
    case 'manager':
      return {
        badge: (
          <Badge className="text-xs px-1.5 py-0 bg-purple-500 text-white">
            Manager
          </Badge>
        ),
        avatarBg: 'bg-purple-500/10',
        avatarColor: 'text-purple-600',
        icon: <Shield className="h-4 w-4" />,
      }
    case 'leader':
      return {
        badge: (
          <Badge className="text-xs px-1.5 py-0 bg-amber-500 text-white">
            Leader
          </Badge>
        ),
        avatarBg: 'bg-amber-500/10',
        avatarColor: 'text-amber-600',
        icon: <Users className="h-4 w-4" />,
      }
    default:
      return {
        badge: null,
        avatarBg: 'bg-gray-500/10',
        avatarColor: 'text-gray-600',
        icon: null,
      }
  }
}

export function UserDropdown({
  user,
  onLogout,
  onRefreshSession,
  align = 'end',
  showUpChevron = false,
  compact = false,
}: UserDropdownProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { badge, avatarBg, avatarColor, icon } = getRoleBadge(user.role)

  const handleRefreshSession = async () => {
    if (!onRefreshSession) return
    setIsRefreshing(true)
    try {
      await onRefreshSession()
      // Optional: reload page to ensure all components pick up new permissions
      window.location.reload()
    } catch (error) {
      console.error('Failed to refresh session:', error)
    } finally {
      setIsRefreshing(false)
    }
  }
  const isAdminOrManager = user.role === 'admin' || user.role === 'manager'
  const initials = user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()

  // Compact mode - static style without dropdown (for GCPP Check)
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full ${avatarBg} flex items-center justify-center`}>
            {icon ? (
              <span className={avatarColor}>{icon}</span>
            ) : (
              <span className={`text-sm font-semibold ${avatarColor}`}>
                {initials}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || 'User'}
              </p>
              {badge}
            </div>
            <p className="text-xs text-gray-600 truncate">{user.email}</p>
          </div>
        </div>

        {/* Admin Links - Only for Admin/Manager */}
        {isAdminOrManager && (
          <div className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 text-xs text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/team-settings"
              className="flex items-center gap-2 px-3 py-2 text-xs text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Users className="h-4 w-4" />
              Team Settings
            </Link>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          <ChevronUp className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    )
  }

  // Normal dropdown mode
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto py-2 px-3">
          {/* Avatar */}
          <div className={`h-8 w-8 rounded-full ${avatarBg} flex items-center justify-center`}>
            {icon ? (
              <span className={avatarColor}>{icon}</span>
            ) : (
              <span className={`text-xs font-semibold ${avatarColor}`}>
                {initials}
              </span>
            )}
          </div>
          {/* User Info */}
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {user.name || 'User'}
            </div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
          {showUpChevron ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-56 z-[100]">
        {/* User Info Label */}
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <span>{user.name || 'User'}</span>
            {badge}
          </div>
          <div className="text-xs font-normal text-gray-500">{user.email}</div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Dashboard - Only for Admin/Manager */}
        {isAdminOrManager && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin" className="flex items-center cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Team Settings - Only for Admin/Manager */}
        {isAdminOrManager && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin/team-settings" className="flex items-center cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Team Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Refresh Session - Manual refresh for role changes */}
        {onRefreshSession && (
          <>
            <DropdownMenuItem
              onClick={handleRefreshSession}
              disabled={isRefreshing}
              className="cursor-pointer"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Logout */}
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <ChevronUp className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
