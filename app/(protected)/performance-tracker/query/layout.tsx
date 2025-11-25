'use client'

/**
 * Query Lab Layout
 *
 * This layout does NOT include the main AnalyticsSidebar.
 * QueryLabView has its own session sidebar for chat history.
 * This gives a full-screen ChatGPT/Claude-like experience.
 */

import { CrossFilterProvider } from '@/app/contexts/CrossFilterContext'

export default function QueryLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <CrossFilterProvider>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </CrossFilterProvider>
  )
}
