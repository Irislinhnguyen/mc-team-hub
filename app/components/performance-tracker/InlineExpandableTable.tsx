'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { colors } from '../../../lib/colors'

interface InlineExpandableTableProps {
  title: string
  count: number
  isExpanded: boolean
  onClose: () => void
  color: string
  children: ReactNode // DataTable or CompactZoneCard grid
}

export function InlineExpandableTable({
  title,
  count,
  isExpanded,
  onClose,
  color,
  children
}: InlineExpandableTableProps) {

  if (!isExpanded) return null

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        opacity: isExpanded ? 1 : 0,
        maxHeight: isExpanded ? '2000px' : '0'
      }}
    >
      <Card
        className="border-2 transition-shadow duration-200"
        style={{
          borderColor: color,
          backgroundColor: colors.surface.card
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2" style={{ color: colors.text.primary }}>
            {title}
            <span
              className="text-sm font-normal px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${color}20`,
                color: color
              }}
            >
              {count} zone{count !== 1 ? 's' : ''}
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8"
            style={{ color: colors.text.secondary }}
          >
            <X size={16} className="mr-1" />
            Close
          </Button>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
