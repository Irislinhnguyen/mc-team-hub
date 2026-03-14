'use client'

import React from 'react'
import { Calendar, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateModeToggleProps {
  mode: 'single' | 'range'
  onModeChange: (mode: 'single' | 'range') => void
  className?: string
}

export function DateModeToggle({ mode, onModeChange, className }: DateModeToggleProps) {
  return (
    <div className={cn("inline-flex rounded-lg border border-gray-300 bg-white p-1", className)}>
      <button
        onClick={() => onModeChange('single')}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
          mode === 'single'
            ? "bg-[#1565C0] text-white"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <Calendar size={16} />
        <span>Single Date</span>
      </button>
      <button
        onClick={() => onModeChange('range')}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
          mode === 'range'
            ? "bg-[#1565C0] text-white"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <CalendarRange size={16} />
        <span>Date Range</span>
      </button>
    </div>
  )
}
