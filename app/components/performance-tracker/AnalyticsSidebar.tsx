'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, TrendingUp, Calendar, Settings, FileText, Plus, SearchCheck, Home, LogOut, Shield } from 'lucide-react'
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

const ANALYTICS_PAGES: PageItem[] = [
  {
    href: '/performance-tracker/business-health',
    label: 'Business Health',
    icon: <BarChart3 size={18} />,
  },
  {
    href: '/performance-tracker/profit-projections',
    label: 'Projections',
    icon: <TrendingUp size={18} />,
  },
  {
    href: '/performance-tracker/daily-ops',
    label: 'Daily Ops - Top Movers',
    icon: <Calendar size={18} />,
  },
  {
    href: '/performance-tracker/daily-ops-publisher-summary',
    label: 'Daily Ops - Publisher Summary',
    icon: <FileText size={18} />,
  },
  {
    href: '/performance-tracker/new-sales',
    label: 'New Sales',
    icon: <Plus size={18} />,
  },
  {
    href: '/performance-tracker/deep-dive',
    label: 'Deep Dive',
    icon: <SearchCheck size={18} />,
  },
  {
    href: '/performance-tracker/team-setup',
    label: 'Team Setup',
    icon: <Settings size={18} />,
  },
]


export function AnalyticsSidebar() {
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
          <h2 className="text-lg font-semibold text-[#1565C0]">Performance Tracker</h2>
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

            {ANALYTICS_PAGES.map((page) => {
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
                {user.role === 'admin' ? (
                  <Shield className="h-4 w-4 text-[#1565C0]" />
                ) : (
                  <span className="text-xs font-semibold text-[#1565C0]">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'User'}
                  </p>
                  {user.role === 'admin' && (
                    <Badge className="text-xs px-1 py-0 bg-[#1565C0] hover:bg-[#0D47A1]">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full gap-2 text-xs justify-start hover:bg-gray-100"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
