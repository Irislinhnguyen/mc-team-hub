import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Trophy, Users, MessageSquare, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminOverviewPage() {
  const quickLinks = [
    { name: 'AI Usage', href: '/admin/ai-usage', icon: <BarChart3 className="w-5 h-5" />, description: 'Monitor AI usage and costs' },
    { name: 'Challenges', href: '/admin/challenges', icon: <Trophy className="w-5 h-5" />, description: 'Manage knowledge challenges' },
    { name: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" />, description: 'Manage user roles and permissions' },
    { name: 'Feedback', href: '/admin/feedback', icon: <MessageSquare className="w-5 h-5" />, description: 'View and manage user feedback' },
    { name: 'Team Settings', href: '/admin/team-settings', icon: <Settings className="w-5 h-5" />, description: 'Configure team settings' },
  ]

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Overview dashboard will be implemented in Phase 4
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Phase 4 Feature</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800">
              This dashboard will provide comprehensive analytics including training completion monitoring,
              grading status, AI cost tracking, and quick action buttons for common admin tasks.
            </p>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Card key={link.href} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {link.icon}
                  </div>
                  <CardTitle className="text-lg">{link.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{link.description}</p>
                <Link href={link.href}>
                  <Button variant="outline" size="sm" className="w-full">
                    Open
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
