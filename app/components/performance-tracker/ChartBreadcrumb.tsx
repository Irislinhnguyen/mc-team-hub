'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import { colors } from '../../../lib/colors'
import { typography } from '../../../lib/design-tokens'

interface BreadcrumbLevel {
  level: string
  id: string
  name: string
}

interface ChartBreadcrumbProps {
  path: BreadcrumbLevel[]
  onNavigate: (index: number) => void
}

export function ChartBreadcrumb({ path, onNavigate }: ChartBreadcrumbProps) {
  if (path.length === 0) {
    return (
      <div style={{ fontSize: typography.sizes.dataPoint, color: colors.text.secondary }}>
        All Teams
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: typography.sizes.dataPoint }}>
      {/* Root level - always clickable */}
      <button
        onClick={() => onNavigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: colors.main,
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: '2px',
          fontSize: typography.sizes.dataPoint,
          textDecoration: 'underline'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.neutralLight
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        All Teams
      </button>

      {path.map((level, index) => (
        <React.Fragment key={`${level.level}-${level.id}`}>
          <ChevronRight size={14} color={colors.text.secondary} />
          {index === path.length - 1 ? (
            // Current level - not clickable
            <span style={{ color: colors.text.primary, fontWeight: 500 }}>
              {level.name}
            </span>
          ) : (
            // Previous levels - clickable
            <button
              onClick={() => onNavigate(index)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.main,
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '2px',
                fontSize: typography.sizes.dataPoint,
                textDecoration: 'underline'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.neutralLight
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {level.name}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
