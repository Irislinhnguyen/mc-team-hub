'use client'

import { usePathname } from 'next/navigation'
import { AnalyticsSidebar } from '../../components/performance-tracker/AnalyticsSidebar'
import { FloatingToggle } from '../../components/performance-tracker/FloatingToggle'
import { CrossFilterProvider } from '../../contexts/CrossFilterContext'
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar'

function AnalyticsContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()

  return (
    <SidebarInset>
      <div
        className="min-h-screen bg-gray-50 transition-[padding-left] duration-150 ease-out"
        style={{
          paddingLeft: open ? '0' : '48px',
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        <FloatingToggle />
        {children}
      </div>
    </SidebarInset>
  )
}

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Query Lab has its own layout with session sidebar - don't show Analytics sidebar
  const isQueryLab = pathname?.startsWith('/performance-tracker/query')

  if (isQueryLab) {
    // Query Lab uses its own full-screen layout
    return (
      <CrossFilterProvider>
        {children}
      </CrossFilterProvider>
    )
  }

  return (
    <CrossFilterProvider>
      <SidebarProvider defaultOpen={true}>
        <style jsx global>{`
          [data-sidebar] {
            transition-duration: 150ms !important;
            transition-timing-function: ease-out !important;
          }
        `}</style>
        <AnalyticsSidebar />
        <AnalyticsContent>{children}</AnalyticsContent>
      </SidebarProvider>
    </CrossFilterProvider>
  )
}
