'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LineChart,
  Shield,
  Home,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Wrench,
  Trophy,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function MobileMenuContent() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isClosing, setIsClosing] = useState(false)

  const mainSections = [
    {
      href: '/',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
    },
    {
      href: '/performance-tracker/business-health',
      label: 'Performance Tracker',
      icon: <LineChart className="h-5 w-5" />,
    },
    {
      href: '/gcpp-check/market-overview',
      label: 'GCPP Check',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      href: '/tools',
      label: 'Tools',
      icon: <Wrench className="h-5 w-5" />,
    },
    {
      href: '/challenges',
      label: 'Challenges',
      icon: <Trophy className="h-5 w-5" />,
    },
  ]

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold text-[#1565C0]">MC Team Hub</h2>
        <p className="text-xs text-gray-500 mt-1">Navigation Menu</p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {mainSections.map((section) => {
            const isActive =
              (pathname?.startsWith(section.href) && section.href !== '/') ||
              pathname === section.href

            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#1565C0] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {section.icon}
                  <span className="flex-1">{section.label}</span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Separator />

      {/* User Section */}
      <div className="p-3 border-t bg-gray-50">
        {user && (
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center gap-2 px-2">
              <div className="h-10 w-10 rounded-full bg-[#1565C0]/10 flex items-center justify-center flex-shrink-0">
                {user.role === 'admin' ? (
                  <Shield className="h-5 w-5 text-[#1565C0]" />
                ) : (
                  <span className="text-sm font-semibold text-[#1565C0]">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name || 'User'}
                  </p>
                  {user.role === 'admin' && (
                    <Badge className="text-xs px-1.5 py-0 bg-[#1565C0]">
                      Admin
                    </Badge>
                  )}
                  {user.role === 'manager' && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Manager
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Admin Dashboard Link */}
            {(user.role === 'admin' || user.role === 'manager') && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-700"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            )}

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
