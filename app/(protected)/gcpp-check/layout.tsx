'use client'

import { GCPPCheckSidebar } from '../../components/gcpp-check/GCPPCheckSidebar'
import { FloatingToggle } from '../../components/performance-tracker/FloatingToggle'
import { CrossFilterProvider } from '../../contexts/CrossFilterContext'
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar'

function GCPPContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()

  // ✨ REMOVED: Filter clearing on navigation
  // Now using React Query caching + persisted filters per tab
  // Each tab remembers its own filters via localStorage

  return (
    <SidebarInset>
      <div
        className="min-h-screen bg-gray-50 transition-[padding-left] duration-150 ease-out"
        style={{
          paddingLeft: open ? '0' : '48px',
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          overflow: 'auto'
        }}
      >
        <FloatingToggle />
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
