import * as React from 'react'
import { Button } from '@/components/ui/button'

export interface AdminHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
}

export function AdminHeader({
  title,
  description,
  action,
}: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="bg-[#1565C0] hover:bg-[#0D47A1]">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}
