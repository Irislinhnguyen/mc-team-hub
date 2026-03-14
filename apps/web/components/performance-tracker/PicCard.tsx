'use client'

/**
 * PicCard Component
 * A draggable card representing a PIC (Person in Charge)
 */

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface PicCardProps {
  picName: string
  isDragging?: boolean
}

export function PicCard({ picName, isDragging = false }: PicCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: picName,
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        px-3 py-2 bg-white border-2 rounded shadow-sm
        cursor-grab active:cursor-grabbing
        transition-all duration-200 ease-out
        ${isDragging
          ? 'opacity-30 scale-95 border-blue-300 shadow-lg'
          : 'border-gray-300 hover:border-blue-400 hover:shadow-lg hover:scale-105 hover:-translate-y-1'
        }
      `}
    >
      <div className="text-sm font-medium text-gray-900">{picName}</div>
    </div>
  )
}
