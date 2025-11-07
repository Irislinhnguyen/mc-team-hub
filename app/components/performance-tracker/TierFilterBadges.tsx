'use client'

import React from 'react'
import { getTierInfo, TierType } from '../../../lib/utils/tierClassification'

interface TierCount {
  hero: number
  solid: number
  underperformer: number
  remove: number
  new: number
  lost: number
}

interface TierFilterBadgesProps {
  tiers: TierCount
  activeTier: TierType | null
  onSelectTier: (tier: TierType | null) => void
  className?: string
}

export default function TierFilterBadges({
  tiers,
  activeTier,
  onSelectTier,
  className = ''
}: TierFilterBadgesProps) {
  // All 6 tiers in display order
  const allTiers: TierType[] = ['hero', 'solid', 'underperformer', 'remove', 'new', 'lost']

  return (
    <div className={`${className}`}>
      {/* Single row of 6 tier badges */}
      <div className="flex gap-2 flex-wrap">
        {allTiers.map((tier) => {
          const info = getTierInfo(tier)
          const count = tiers[tier] || 0
          const isActive = activeTier === tier
          const isDisabled = count === 0

          return (
            <button
              key={tier}
              onClick={() => {
                if (isDisabled) return
                onSelectTier(isActive ? null : tier)
              }}
              disabled={isDisabled}
              className={`
                px-3 py-1.5 rounded text-xs font-medium transition-all
                flex items-center gap-2
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
              `}
              style={{
                backgroundColor: isActive ? info.color : '#ffffff',
                color: isActive ? '#ffffff' : info.color,
                borderColor: info.color,
                borderWidth: isActive ? '2px' : '1px',
                borderStyle: 'solid'
              }}
              title={info.description}
            >
              <span>{info.label}</span>
              <span
                className="text-xs font-semibold"
                style={{
                  color: isActive ? '#ffffff' : info.color
                }}
              >
                {count}
              </span>
            </button>
          )
        })}

        {/* Clear Filter inline */}
        {activeTier && (
          <button
            onClick={() => onSelectTier(null)}
            className="px-3 py-1.5 rounded-md text-xs text-gray-500 hover:bg-gray-100 transition-colors border border-gray-300"
          >
            Clear ✕
          </button>
        )}
      </div>
    </div>
  )
}
