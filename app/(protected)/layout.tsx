import { SalesListProvider } from '../contexts/SalesListContext'

/**
 * Protected Layout
 * Authentication is enforced by middleware.ts
 * Only authenticated users can access routes under (protected)
 *
 * Note: This layout is now minimal - each page handles its own layout
 * - Homepage: Custom layout with header
 * - Analytics/Performance Tracker: Has its own sidebar layout
 * - Sales Lists: Uses SalesListProvider for state management
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SalesListProvider>{children}</SalesListProvider>
}
