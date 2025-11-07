'use client'

import { PanelLeft } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'

export function FloatingToggle() {
  const { open, toggleSidebar } = useSidebar()

  // Only show when sidebar is closed
  if (open) return null

  return (
    <button
      onClick={toggleSidebar}
      className="fixed top-6 left-4 z-40 p-1.5 hover:bg-gray-200/30 rounded transition-colors"
      aria-label="Open sidebar"
      style={{
        border: 'none',
        background: 'rgb(249 250 251)' // bg-gray-50 - same as page background
      }}
    >
      <PanelLeft className="h-4 w-4 text-gray-400" />
    </button>
  )
}
