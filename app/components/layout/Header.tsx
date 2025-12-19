'use client';

import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, LayoutDashboard, Shield } from 'lucide-react';
// import { NotificationBell } from '../notifications/NotificationBell'; // TODO: Enable when notifications feature is ready
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '../../hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MobileMenuTrigger } from './MobileMenu';

// Mobile Header Layout
function MobileHeaderLayout() {
  return (
    <div className="flex items-center justify-between">
      {/* Left: Hamburger Menu */}
      <MobileMenuTrigger />

      {/* Center: Logo */}
      <h1 className="text-xl font-bold text-[#1565C0] flex-1 text-center">
        MC Team Hub
      </h1>

      {/* Right: Spacer for balance */}
      <div className="w-10" />
    </div>
  );
}

// Desktop Header Layout
function DesktopHeaderLayout({ user, isLoading, logout }: { user: any; isLoading: boolean; logout: () => Promise<void> }) {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex items-center justify-between">
      {/* Left: Logo + Description */}
      <div>
        <h1 className="text-3xl font-bold text-[#1565C0]">MC Team Hub</h1>
        <p className="text-gray-600 mt-1">
          Your central hub for analytics, compliance monitoring, and team
          collaboration
        </p>
      </div>

      {/* Right: User Profile Dropdown */}
      {isLoading ? (
        <div className="flex items-center gap-4">
          <div className="text-right space-y-2">
            <Skeleton className="h-5 w-32 ml-auto" />
            <Skeleton className="h-4 w-40 ml-auto" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ) : user ? (
        <div className="flex items-center gap-4">
          {/* Notification Bell - TODO: Enable when notifications feature is ready */}
          {/* <NotificationBell /> */}

          {/* User Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-auto py-2 px-3">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-[#1565C0]/10 flex items-center justify-center">
                  {user.role === 'admin' ? (
                    <Shield className="h-4 w-4 text-[#1565C0]" />
                  ) : (
                    <span className="text-xs font-semibold text-[#1565C0]">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
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
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {/* User Info Label */}
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <span>{user.name || 'User'}</span>
                  {user.role === 'admin' && (
                    <Badge className="text-xs px-1.5 py-0 bg-[#1565C0] hover:bg-[#0D47A1]">
                      Admin
                    </Badge>
                  )}
                  {user.role === 'manager' && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Manager
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-normal text-gray-500">{user.email}</div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Dashboard - Only for Admin/Manager */}
              {(user.role === 'admin' || user.role === 'manager') && (
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

              {/* Logout */}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const { user, isLoading, logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
      <div
        className={cn(
          'container mx-auto transition-all',
          isMobile ? 'px-4 py-3' : 'px-8 py-6'
        )}
      >
        {isMobile ? (
          <MobileHeaderLayout />
        ) : (
          <DesktopHeaderLayout user={user} isLoading={isLoading} logout={logout} />
        )}
      </div>
    </header>
  );
}
