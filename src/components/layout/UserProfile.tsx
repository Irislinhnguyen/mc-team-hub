'use client'

import { LogOut, Shield, Crown, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../../../app/contexts/AuthContext'

export const UserProfile = () => {
  const { user, logout, isLoading } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email[0].toUpperCase()

  return (
    <div className="p-4 border-t border-border bg-sidebar">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={`${
            user.role === 'admin' ? 'bg-orange-100 text-orange-600' :
            user.role === 'manager' ? 'bg-purple-100 text-purple-600' :
            user.role === 'leader' ? 'bg-amber-100 text-amber-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {user.role === 'admin' ? (
              <Shield className="h-5 w-5" />
            ) : user.role === 'manager' ? (
              <Crown className="h-5 w-5" />
            ) : user.role === 'leader' ? (
              <Users className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name || 'User'}
            </p>
            {user.role === 'admin' && (
              <Badge className="text-xs px-1 py-0 bg-orange-500 text-white hover:bg-orange-600">
                Admin
              </Badge>
            )}
            {user.role === 'manager' && (
              <Badge className="text-xs px-1 py-0 bg-purple-500 text-white hover:bg-purple-600">
                Manager
              </Badge>
            )}
            {user.role === 'leader' && (
              <Badge className="text-xs px-1 py-0 bg-amber-500 text-white hover:bg-amber-600">
                Leader
              </Badge>
            )}
          </div>
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {user.email}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
