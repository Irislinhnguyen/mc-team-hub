import { redirect } from 'next/navigation'
import { getServerUser, isAdminOrManager } from '@/lib/auth/server'
import AdminSidebar from './AdminSidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Server-side authentication check
  const user = await getServerUser()

  if (!user) {
    redirect('/auth')
  }

  if (!isAdminOrManager(user)) {
    redirect('/')
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Client Component */}
      <AdminSidebar userRole={user.role || 'user'} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {children}
      </div>
    </div>
  )
}
