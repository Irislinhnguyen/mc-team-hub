'use client'

import { GCPPCheckSidebar } from '../../components/gcpp-check/GCPPCheckSidebar'
import { CrossFilterProvider } from '../../contexts/CrossFilterContext'
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '../../hooks/use-mobile'
import { cn } from '@/lib/utils'

function GCPPContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()
  const isMobile = useIsMobile()

  // ✨ REMOVED: Filter clearing on navigation
  // Now using React Query caching + persisted filters per tab
  // Each tab remembers its own filters via localStorage

  return (
    <SidebarInset>
      <div
        className={cn(
          'min-h-screen bg-gray-50 transition-all duration-150 ease-out',
          // Mobile: No padding (sidebar is drawer)
          // Desktop: Dynamic padding based on sidebar state
          isMobile ? 'pl-0' : open ? 'pl-0' : 'pl-12'
        )}
        style={{
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        {children}
      </div>
    </SidebarInset>
  )
}

export default function GCPPCheckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CrossFilterProvider>
      <SidebarProvider defaultOpen={true}>
        <style jsx global>{`
          [data-sidebar] {
            transition-duration: 150ms !important;
            transition-timing-function: ease-out !important;
          }
        `}</style>
        <GCPPCheckSidebar />
        <GCPPContent>{children}</GCPPContent>
      </SidebarProvider>
    </CrossFilterProvider>
  )
}
