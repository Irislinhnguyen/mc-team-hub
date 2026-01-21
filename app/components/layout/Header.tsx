'use client';

import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, Home, LogOut, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { UserDropdown } from '../shared/UserDropdown';

export function Header() {
  const { user, isLoading, logout, refreshSession } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleRefreshSession = async () => {
    await refreshSession();
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
              {/* User Dropdown - Shared Component */}
              <UserDropdown user={user} onLogout={logout} onRefreshSession={handleRefreshSession} align="end" />
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
