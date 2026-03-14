'use client'

import { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  title: string
  description: string
  icon: ReactNode
  status: 'active' | 'developing'
  onClick: (() => void) | null
}

export function ProductCard({ title, description, icon, status, onClick }: ProductCardProps) {
  const isActive = status === 'active'
  const isClickable = isActive && onClick !== null

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isClickable && 'cursor-pointer hover:shadow-lg hover:scale-105 hover:border-primary',
        !isClickable && 'opacity-75'
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className={cn(
            'p-3 rounded-lg',
            isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <div className="h-8 w-8">
              {icon}
            </div>
          </div>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              'ml-2',
              isActive && 'bg-[#1565C0] hover:bg-[#0D47A1]',
              !isActive && 'bg-gray-400 hover:bg-gray-500 text-white'
            )}
          >
            {isActive ? 'Active' : 'Under Development'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <CardTitle className="text-2xl mb-2">{title}</CardTitle>
        <CardDescription className="text-base">
          {description}
        </CardDescription>

        {!isActive && (
          <p className="text-sm text-muted-foreground mt-4 italic">
            Coming soon...
          </p>
        )}
      </CardContent>

      {isClickable && (
        <div className="absolute inset-0 bg-primary/0 hover:bg-primary/5 transition-colors pointer-events-none" />
      )}
    </Card>
  )
}
