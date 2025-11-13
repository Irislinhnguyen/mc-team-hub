'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../src/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface RefreshButtonProps {
  /**
   * Optional query key to invalidate specific queries.
   * If not provided, invalidates all queries.
   */
  queryKey?: unknown[]

  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'

  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'

  /**
   * Optional callback after successful refresh
   */
  onRefreshComplete?: () => void
}

/**
 * RefreshButton - Manual data refresh button using React Query
 *
 * Invalidates cached queries and triggers refetch.
 * Shows loading state with spinning icon during refetch.
 *
 * @example
 * // Refresh all queries
 * <RefreshButton />
 *
 * @example
 * // Refresh specific query
 * <RefreshButton queryKey={['business-health']} />
 */
export function RefreshButton({
  queryKey,
  variant = 'outline',
  size = 'default',
  onRefreshComplete
}: RefreshButtonProps) {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)

    try {
      if (queryKey) {
        // Invalidate specific queries matching the key
        await queryClient.invalidateQueries({ queryKey })
      } else {
        // Invalidate all queries
        await queryClient.invalidateQueries()
      }

      onRefreshComplete?.()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      // Keep spinning for a moment to show user that action completed
      setTimeout(() => {
        setIsRefreshing(false)
      }, 500)
    }
  }

  return (
    <Button
      onClick={handleRefresh}
      variant={variant}
      size={size}
      disabled={isRefreshing}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {size !== 'icon' && (isRefreshing ? 'Refreshing...' : 'Refresh')}
    </Button>
  )
}
