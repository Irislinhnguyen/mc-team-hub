'use client'

/**
 * MetadataErrorUI - Displays error state for metadata fetching failures
 *
 * Provides a consistent error UI with retry functionality across all
 * analytics pages.
 */

interface MetadataErrorUIProps {
  error: string
  onRetry?: () => void
}

export function MetadataErrorUI({ error, onRetry }: MetadataErrorUIProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900 mb-2">Failed to Load Filters</h3>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
