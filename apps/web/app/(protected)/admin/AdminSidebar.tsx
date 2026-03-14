'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Trophy, MessageSquare, Users, Home, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AdminSidebarProps {
  userRole: string
}

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'AI Usage',
      href: '/admin/ai-usage',
      icon: <BarChart3 size={18} />,
    },
    {
      name: 'Challenges',
      href: '/admin/challenges',
      icon: <Trophy size={18} />,
    },
    {
      name: 'Feedback',
      href: '/admin/feedback',
      icon: <MessageSquare size={18} />,
    },
    {
      name: 'User Roles',
      href: '/admin/users',
      icon: <Users size={18} />,
    },
  ]

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-[#1565C0] text-white'
      case 'manager':
        return 'bg-purple-500 text-white'
      case 'leader':
        return 'bg-amber-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1565C0]/10 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#1565C0]" />
          </div>
          <div>
            <h2 className="text-[#1565C0] font-semibold">Admin Panel</h2>
            <Badge className={`text-xs px-1.5 py-0 ${getRoleBadgeStyle(userRole)}`}>
              {userRole}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {/* Home Link */}
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors mb-2"
        >
          <Home size={18} />
          <span>Home</span>
        </Link>

        {/* Divider */}
        <div className="border-t border-gray-200 my-2" />

        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1565C0] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Admin access only
        </p>
      </div>
    </div>
  )
}
