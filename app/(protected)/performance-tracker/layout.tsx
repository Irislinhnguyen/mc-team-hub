'use client'

import { usePathname } from 'next/navigation'
import { AnalyticsSidebar } from '../../components/performance-tracker/AnalyticsSidebar'
import { CrossFilterProvider } from '../../contexts/CrossFilterContext'
import { SidebarProvider, SidebarInset, SidebarRail, useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '../../hooks/use-mobile'
import { cn } from '@/lib/utils'

function AnalyticsContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()
  const isMobile = useIsMobile()

  return (
    <SidebarInset>
      <div
        className={cn(
          'min-h-screen bg-gray-50 transition-all duration-150 ease-out',
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
        <SidebarRail />
        <AnalyticsContent>{children}</AnalyticsContent>
      </SidebarProvider>
    </CrossFilterProvider>
  )
}
