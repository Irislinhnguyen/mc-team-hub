import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side check: redirect authenticated users to home
  const user = await getServerUser()

  if (user) {
    redirect('/')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {children}
    </div>
  )
}
