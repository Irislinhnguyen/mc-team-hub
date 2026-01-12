'use client';

import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, LayoutDashboard, Shield, Menu, Home, X } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '../../hooks/use-mobile';
import { useState } from 'react';

export function Header() {
  const { user, isLoading, logout } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={`border-b bg-white/80 backdrop-blur-sm shadow-sm ${
      isMobile ? 'fixed top-0 left-0 right-0 z-50' : 'sticky top-0 z-40'
    }`}>
      <div className={`container mx-auto ${isMobile ? 'px-4 py-3' : 'px-8 py-6'}`}>
        <div className="flex items-center justify-between">
          {/* Mobile Hamburger Menu */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-8 w-8 hover:bg-blue-50 flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-[#1565C0]" />
            </Button>
          )}

          <div className={isMobile ? '' : ''}>
            <h1 className={`font-bold text-[#1565C0] ${isMobile ? 'text-lg' : 'text-3xl'}`}>
              {isMobile ? 'MC Hub' : 'MC Team Hub'}
            </h1>
            {!isMobile && (
              <p className="text-gray-600 mt-1">
                Your central hub for analytics, compliance monitoring, and team
                collaboration
              </p>
            )}
          </div>

          {/* User Profile & Notifications */}
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
      </div>

      {/* Mobile Menu Sheet */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-72 bg-white">
            <SheetHeader>
              <SheetTitle className="text-[#1565C0] text-left">Navigation</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Home size={18} className="text-[#1565C0]" />
                <span>Home</span>
              </Link>

              {(user?.role === 'admin' || user?.role === 'manager') && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LayoutDashboard size={18} className="text-[#1565C0]" />
                  <span>Dashboard</span>
                </Link>
              )}

              <div className="my-4 border-t border-gray-200" />

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
