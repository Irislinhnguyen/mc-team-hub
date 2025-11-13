import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '../config/queryClient'

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
  // GCPP Check specific fields
  partners?: Array<{ label: string; value: string }>
  markets?: Array<{ label: string; value: string }>
  publishers?: Array<{ label: string; value: string }>
  domain_app_ids?: Array<{ label: string; value: string }>
  app_names?: Array<{ label: string; value: string }>
  pub_size_categories?: Array<{ label: string; value: string }>
  categories?: Array<{ label: string; value: string }>
  scenarios?: Array<{ label: string; value: string }>
  performances?: Array<{ label: string; value: string }>
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
 * Now uses React Query for automatic caching and background refetching.
 * Metadata is cached for 24 hours since it rarely changes.
 *
 * @param endpoint - Optional custom metadata endpoint (defaults to /api/performance-tracker/metadata)
 * @returns {UseAnalyticsMetadataReturn} Metadata state and refetch function
 *
 * @example
 * const { metadata, loading, error } = useAnalyticsMetadata()
 *
 * if (error) return <MetadataErrorUI error={error} />
 * if (loading) return <FilterPanelSkeleton />
 * return <FilterPanel options={metadata} />
 */
export function useAnalyticsMetadata(
  endpoint: string = '/api/performance-tracker/metadata'
): UseAnalyticsMetadataReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.metadata(endpoint),
    queryFn: async () => {
      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch metadata`)
      }

      const result = await response.json()

      if (result.status === 'ok') {
        return result.data as MetadataOptions
      } else {
        throw new Error(result.message || 'Unknown error fetching metadata')
      }
    },
    // Metadata rarely changes, cache aggressively
    staleTime: cacheConfig.metadata.staleTime,
    gcTime: cacheConfig.metadata.gcTime,
    retry: 2,
  })

  return {
    metadata: data ?? null,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load filters') : null,
    refetch: () => { refetch() }
  }
}
