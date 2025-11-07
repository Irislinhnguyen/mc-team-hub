import { useState, useEffect } from 'react'

export interface MetadataOptions {
  pics: Array<{ label: string; value: string }>
  products: Array<{ label: string; value: string }>
  pids: Array<{ label: string; value: string }>
  mids: Array<{ label: string; value: string }>
  pubnames: Array<{ label: string; value: string }>
  medianames: Array<{ label: string; value: string }>
  zids: Array<{ label: string; value: string }>
  zonenames: Array<{ label: string; value: string }>
  rev_flags: Array<{ label: string; value: string }>
  revenue_tiers: Array<{ label: string; value: string }>
  months: Array<{ label: string; value: string }>
  years: Array<{ label: string; value: string }>
  teams: Array<{ label: string; value: string }>
}

interface UseAnalyticsMetadataReturn {
  metadata: MetadataOptions | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Custom hook to fetch and manage analytics metadata (filter options)
 *
 * @returns {UseAnalyticsMetadataReturn} Metadata state and refetch function
 *
 * @example
 * const { metadata, loading, error } = useAnalyticsMetadata()
 *
 * if (error) return <MetadataErrorUI error={error} />
 * if (loading) return <FilterPanelSkeleton />
 * return <FilterPanel options={metadata} />
 */
export function useAnalyticsMetadata(): UseAnalyticsMetadataReturn {
  const [metadata, setMetadata] = useState<MetadataOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetadata = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/performance-tracker/metadata')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch metadata`)
      }

      const result = await response.json()

      if (result.status === 'ok') {
        setMetadata(result.data)
        setError(null)
      } else {
        throw new Error(result.message || 'Unknown error fetching metadata')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load filters'
      console.error('Error fetching metadata:', errorMessage)
      setError(errorMessage)
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetadata()
  }, [])

  return {
    metadata,
    loading,
    error,
    refetch: fetchMetadata
  }
}
