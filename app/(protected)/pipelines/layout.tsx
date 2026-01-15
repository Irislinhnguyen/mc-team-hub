'use client'

import { PipelinesSidebar } from '../../components/pipelines/PipelinesSidebar'
import { PipelineProvider } from '../../contexts/PipelineContext'
import { SidebarProvider, SidebarInset, SidebarRail, useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '../../hooks/use-mobile'
import { cn } from '@/lib/utils'

function PipelinesContent({ children }: { children: React.ReactNode }) {
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

export default function PipelinesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PipelineProvider>
      <SidebarProvider defaultOpen={true}>
        <style jsx global>{`
          [data-sidebar] {
            transition-duration: 150ms !important;
            transition-timing-function: ease-out !important;
          }
        `}</style>
        <PipelinesSidebar />
        <SidebarRail />
        <PipelinesContent>{children}</PipelinesContent>
      </SidebarProvider>
    </PipelineProvider>
  )
}
