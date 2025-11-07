'use client'

import { User, LogOut, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '../../../app/contexts/AuthContext'

export const HeaderBar = () => {
  const { user, logout, isLoading } = useAuth()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      })
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-medium">
            Production
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
      </header>
    )
  }

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="font-medium">
          Production
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                {user.role === 'admin' ? (
                  <Shield className="h-4 w-4 text-orange-500" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="text-sm">
                <div className="font-medium text-foreground flex items-center gap-2">
                  {user.name || 'User'}
                  {user.role === 'admin' && (
                    <Badge variant="destructive" className="text-xs">
                      Admin
                    </Badge>
                  )}
                  {user.role === 'manager' && (
                    <Badge variant="secondary" className="text-xs">
                      Manager
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
