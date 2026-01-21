'use client'

import { ReactNode } from 'react'
import { ChevronDown, AlertTriangle, TrendingUp, Activity, Minus, Plus } from 'lucide-react'
import { colors } from '../../../lib/colors'
import { cn } from '@/lib/utils'

export interface AlertCardData {
  type: 'critical' | 'high' | 'moderate' | 'lost' | 'new'
  count: number
  label: string
  icon: ReactNode
  color: string
  bgColor: string
  isExpanded: boolean
  onClick: () => void
}

interface ClickableAlertBarProps {
  alerts: AlertCardData[]
}

export function ClickableAlertBar({ alerts }: ClickableAlertBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {alerts.map(alert => (
        <AlertCard key={alert.type} {...alert} />
      ))}
    </div>
  )
}

function AlertCard({
  count,
  label,
  icon,
  color,
  bgColor,
  isExpanded,
  onClick
}: AlertCardData) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group p-4 rounded-lg border-2 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-1",
        "text-center cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        isExpanded && "ring-2 ring-offset-2 shadow-lg"
      )}
      style={{
        borderColor: color,
        backgroundColor: isExpanded ? bgColor : colors.surface.card,
        ...(isExpanded && { '--tw-ring-color': color } as any)
      }}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Icon */}
        <div
          className="p-2 rounded-full transition-colors"
          style={{
            backgroundColor: isExpanded ? color : bgColor,
            color: isExpanded ? colors.text.inverse : color
          }}
        >
          {icon}
        </div>

        {/* Count */}
        <div
          className="text-3xl font-bold tabular-nums transition-colors"
          style={{ color: color }}
        >
          {count}
        </div>

        {/* Label */}
        <div
          className="text-sm font-medium transition-colors"
          style={{ color: isExpanded ? color : colors.text.primary }}
        >
          {label}
        </div>

        {/* View Details Indicator */}
        <div
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: isExpanded ? color : colors.text.secondary }}
        >
          {isExpanded ? 'Hide Details' : 'View Details'}
          <ChevronDown
            size={12}
            className={cn(
              "transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </div>
    </button>
  )
}

// Helper function to create alert data
export function createAlertData(
  type: AlertCardData['type'],
  count: number,
  isExpanded: boolean,
  onClick: () => void
): AlertCardData {
  const configs: Record<AlertCardData['type'], { label: string, icon: ReactNode, color: string, bgColor: string }> = {
    critical: {
      label: 'Critical',
      icon: <AlertTriangle size={20} />,
      color: colors.status.danger,
      bgColor: colors.status.dangerBg
    },
    high: {
      label: 'High Risk',
      icon: <TrendingUp size={20} className="rotate-180" />,
      color: colors.status.warning,
      bgColor: colors.status.warningBg
    },
    moderate: {
      label: 'Moderate',
      icon: <Activity size={20} />,
      color: colors.status.warning,
      bgColor: colors.status.warningBg
    },
    lost: {
      label: 'Lost',
      icon: <Minus size={20} />,
      color: colors.text.secondary,
      bgColor: colors.surface.muted
    },
    new: {
      label: 'New',
      icon: <Plus size={20} />,
      color: colors.status.success,
      bgColor: colors.status.successBg
    }
  }

  return {
    type,
    count,
    isExpanded,
    onClick,
    ...configs[type]
  }
}
