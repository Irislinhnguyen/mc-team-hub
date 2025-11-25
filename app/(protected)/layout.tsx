import { SalesListProvider } from '../contexts/SalesListContext'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

/**
 * Protected Layout
 * Server-side authentication check + middleware enforcement
 * Only authenticated users can access routes under (protected)
 *
 * Note: This layout is now minimal - each page handles its own layout
 * - Homepage: Custom layout with header
 * - Analytics/Performance Tracker: Has its own sidebar layout
 * - Sales Lists: Uses SalesListProvider for state management
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth check
  const user = await getServerUser()

  if (!user) {
    redirect('/auth')
  }

  return <SalesListProvider>{children}</SalesListProvider>
}
