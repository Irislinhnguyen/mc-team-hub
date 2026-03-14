'use client'

/**
 * Pagination Controls Component
 *
 * Displays current count and "Load More" button for cursor-based pagination
 *
 * Features:
 * - Shows progress (e.g., "Showing 50 of 523 pipelines")
 * - Load More button with loading state
 * - Auto-hides when all data is loaded
 */

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface PaginationControlsProps {
  hasMore: boolean
  onLoadMore: () => void
  loading?: boolean
  total?: number
  currentCount: number
}

export function PaginationControls({
  hasMore,
  onLoadMore,
  loading = false,
  total,
  currentCount
}: PaginationControlsProps) {
  // If all data is loaded, hide the pagination controls
  if (!hasMore && currentCount === total) {
    return null
  }

  return (
    <div className="flex items-center justify-center gap-4 py-6">
      {hasMore && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={loading}
          className="min-w-[120px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load More'
          )}
        </Button>
      )}
    </div>
  )
}
