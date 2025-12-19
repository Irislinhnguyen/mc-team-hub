'use client'

import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { MobileMenuContent } from './MobileMenuContent'

export function MobileMenuTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[280px] p-0"
      >
        <MobileMenuContent />
      </SheetContent>
    </Sheet>
  )
}
