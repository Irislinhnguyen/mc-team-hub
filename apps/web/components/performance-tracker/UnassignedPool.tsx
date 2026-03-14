'use client'

/**
 * UnassignedPool Component
 * A droppable zone for PICs that are not assigned to any team
 */

import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { PicCard } from './PicCard'

interface UnassignedPoolProps {
  pics: string[]
}

export function UnassignedPool({ pics }: UnassignedPoolProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned',
  })

  const [searchTerm, setSearchTerm] = useState('')

  const filteredPics = pics.filter(pic =>
    pic.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Unassigned PICs</h3>
        <p className="text-sm text-gray-500">Not assigned to any team</p>
        <div className="text-xs text-gray-400 mt-1">
          {pics.length} PIC{pics.length !== 1 ? 's' : ''}
        </div>
      </div>

      {pics.length > 0 && (
        <input
          type="text"
          placeholder="Search PICs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      )}

      <div
        ref={setNodeRef}
        className={`
          relative flex-1 min-h-[400px] p-4 rounded-lg border-2 border-dashed
          transition-all duration-200 ease-out overflow-y-auto
          ${isOver
            ? 'border-gray-600 bg-gray-200 ring-4 ring-gray-300 ring-opacity-50 scale-[1.02]'
            : 'border-gray-300 bg-gray-50'
          }
        `}
      >
        <div className="space-y-2">
          {filteredPics.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              {searchTerm ? 'No PICs match your search' : 'All PICs are assigned'}
            </div>
          ) : (
            filteredPics.map(picName => (
              <PicCard key={picName} picName={picName} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
