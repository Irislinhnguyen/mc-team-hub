'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Target, Layers, Users, UsersRound, Eye, Home, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../../../app/contexts/AuthContext'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from '@/components/ui/sidebar'

interface PageItem {
  href: string
  label: string
  icon: React.ReactNode
}

const GCPP_CHECK_PAGES: PageItem[] = [
  {
    href: '/gcpp-check/market-overview',
    label: 'Market Overview',
    icon: <Target size={18} />,
  },
  {
    href: '/gcpp-check/market-breakdown',
    label: 'Market Breakdown',
    icon: <Layers size={18} />,
  },
  {
    href: '/gcpp-check/partner-breakdown',
    label: 'Partner Breakdown',
    icon: <Users size={18} />,
  },
  {
    href: '/gcpp-check/partner-breakdown-2',
    label: 'Partner Breakdown - Part 2',
    icon: <UsersRound size={18} />,
  },
  {
    href: '/gcpp-check/publisher-monitoring',
    label: 'Publisher Monitoring',
    icon: <Eye size={18} />,
  },
]

export function GCPPCheckSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Sidebar className="bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1565C0]">GCPP Check</h2>
          <SidebarTrigger className="ml-auto" />
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1 p-3">
            {/* Home Link */}
            <li>
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Home size={18} />
                <span>Home</span>
              </Link>
            </li>

            {/* Divider */}
            <li className="py-2">
              <div className="border-t border-gray-200" />
            </li>

            {GCPP_CHECK_PAGES.map((page) => {
              const isActive = pathname === page.href
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1565C0] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page.icon}
                    <span>{page.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </SidebarContent>

      {/* Footer - User Profile */}
      <SidebarFooter className="p-3 border-t border-gray-200">
        {user && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#1565C0]/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-[#1565C0]">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'User'}
                  </p>
                  {user.role === 'admin' && (
                    <Badge className="text-xs bg-[#1565C0] hover:bg-[#0D47A1] px-1.5 py-0">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
            {/* Admin Panel Link - Only for admin and manager */}
            {(user.role === 'admin' || user.role === 'manager') && (
              <Link
                href="/admin/ai-usage"
                className="flex items-center gap-2 px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                AI Usage Dashboard
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
