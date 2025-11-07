'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnalyticsSidebar } from '../../components/performance-tracker/AnalyticsSidebar'
import { FloatingToggle } from '../../components/performance-tracker/FloatingToggle'
import { CrossFilterProvider, useCrossFilter } from '../../contexts/CrossFilterContext'
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar'

function AnalyticsContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()
  const { clearAllCrossFilters } = useCrossFilter()
  const pathname = usePathname()

  // Clear cross-filters and normal filters when navigating between analytics pages
  useEffect(() => {
    clearAllCrossFilters()
    window.dispatchEvent(new Event('clearAllAppliedFilters'))
  }, [pathname, clearAllCrossFilters])

  return (
    <SidebarInset>
      <div
        className="min-h-screen bg-gray-50 transition-[padding-left] duration-150 ease-out"
        style={{
          paddingLeft: open ? '0' : '48px', // Reserve space for floating toggle when sidebar closed
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
