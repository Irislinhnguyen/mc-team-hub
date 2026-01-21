'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Users, Target, Settings, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../../../app/contexts/AuthContext'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { UserDropdown } from '../shared/UserDropdown'

interface PageItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string
}

const PIPELINE_PAGES: PageItem[] = [
  {
    href: '/pipelines',
    label: 'Pipeline Overview',
    icon: <BarChart3 size={18} />,
  },
  {
    href: '/pipelines/team-setup',
    label: 'Team Setup',
    icon: <Users size={18} />,
  },
  {
    href: '/pipelines/focus',
    label: 'Focus of the Month',
    icon: <Target size={18} />,
  },
  {
    href: '/pipelines/sheet-config',
    label: 'Sheet Management',
    icon: <Settings size={18} />,
  },
]

export function PipelinesSidebar() {
  const pathname = usePathname()
  const { user, logout, refreshSession } = useAuth()
  const { setOpenMobile } = useSidebar()
  const isMobile = useIsMobile()

  const handleLogout = async () => {
    await logout()
  }

  const handleRefreshSession = async () => {
    await refreshSession()
  }

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar className="bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1565C0]">Pipelines</h2>
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
                onClick={handleLinkClick}
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

            {PIPELINE_PAGES.map((page) => {
              const isActive = pathname === page.href
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1565C0] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page.icon}
                    <span className="flex-1">{page.label}</span>
                    {page.badge && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[#1565C0]/10 text-[#1565C0] border-[#1565C0]/20">
                        {page.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </SidebarContent>

      {/* Footer - User Profile with Dropdown */}
      <SidebarFooter className="p-3 border-t border-gray-200">
        {user && (
          <UserDropdown user={user} onLogout={handleLogout} onRefreshSession={handleRefreshSession} align="start" showUpChevron />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
