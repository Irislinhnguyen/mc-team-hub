'use client'

/**
 * TeamColumn Component
 * A droppable zone representing a team where PICs can be dropped
 */

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { PicCard } from './PicCard'

interface TeamColumnProps {
  team: {
    team_id: string
    team_name: string
    description: string | null
  }
  pics: string[]
}

export function TeamColumn({ team, pics }: TeamColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: team.team_id,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{team.team_name}</h3>
        {team.description && (
          <p className="text-sm text-gray-500">{team.description}</p>
        )}
        <div className="text-xs text-gray-400 mt-1">
          {pics.length} member{pics.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`
          relative flex-1 min-h-[400px] p-4 rounded-lg border-2 border-dashed
          transition-all duration-200 ease-out
          ${isOver
            ? 'border-blue-500 bg-blue-100 ring-4 ring-blue-200 ring-opacity-50 scale-[1.02]'
            : 'border-gray-300 bg-gray-50'
          }
        `}
      >
        <div className="space-y-2">
          {pics.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              Drag PICs here
            </div>
          ) : (
            pics.map(picName => (
              <PicCard key={picName} picName={picName} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
