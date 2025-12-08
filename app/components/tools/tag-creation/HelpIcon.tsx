'use client'

import { HelpCircle } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface HelpIconProps {
  content: string
  title?: string
}

export function HelpIcon({ content, title }: HelpIconProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="ml-2 text-gray-400 hover:text-[#1565C0] transition-colors"
          aria-label="Show help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4"
        align="start"
        side="bottom"
      >
        {title && (
          <h4 className="font-medium text-sm text-gray-900 mb-2">{title}</h4>
        )}
        <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
          {content}
        </div>
      </PopoverContent>
    </Popover>
  )
}
