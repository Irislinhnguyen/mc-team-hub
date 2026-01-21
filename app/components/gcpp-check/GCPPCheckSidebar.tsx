'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Target, Layers, Users, UsersRound, Eye, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../../../app/contexts/AuthContext'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { UserDropdown } from '../shared/UserDropdown'

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
  const { user, logout, refreshSession } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  const handleRefreshSession = async () => {
    await refreshSession()
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
          <UserDropdown user={user} onLogout={handleLogout} onRefreshSession={handleRefreshSession} compact />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
