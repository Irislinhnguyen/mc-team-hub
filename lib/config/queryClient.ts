/**
 * React Query (TanStack Query) Configuration
 *
 * Optimized for analytics dashboard with daily batch-processed data from BigQuery.
 * Data updates once per day, so we use aggressive caching with long stale times.
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Create a new QueryClient instance with optimized defaults for analytics dashboards
 *
 * Cache Strategy:
 * - Daily batch data: Long staleTime (1 hour), longer gcTime (2 hours)
 * - Metadata/filters: Very long staleTime (24 hours), gcTime (48 hours)
 * - No background refetching (data is not real-time)
 * - Manual refresh via invalidateQueries()
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (won't refetch during this time)
      staleTime: 5 * 60 * 1000, // 5 minutes (default, override per query)

      // How long inactive data stays in cache before garbage collection
      gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime in v4)

      // Disable automatic background refetching
      // Our data updates daily, not real-time, so no need for aggressive refetching
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,

      // Retry failed queries twice with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

/**
 * Query key factories for consistent cache management
 *
 * Usage:
 * useQuery({ queryKey: queryKeys.businessHealth(filters), ... })
 */
/**
 * Serialize filters for stable query keys
 * Ensures React Query detects changes in filter objects
 */
function serializeFilters(filters: Record<string, any>): string {
  // Sort keys and serialize to ensure consistent string representation
  const sortedKeys = Object.keys(filters).sort()
  const serialized = sortedKeys.map(key => {
    const value = filters[key]
    if (value === null || value === undefined) return `${key}:null`
    if (typeof value === 'object') return `${key}:${JSON.stringify(value)}`
    return `${key}:${String(value)}`
  }).join('|')
  return serialized
}

export const queryKeys = {
  // Analytics pages - use serialized filters for stable cache keys
  businessHealth: (filters: Record<string, any>) => ['analytics', 'business-health', serializeFilters(filters)] as const,
  dailyOps: (filters: Record<string, any>) => ['analytics', 'daily-ops', serializeFilters(filters)] as const,
  profitProjections: (filters: Record<string, any>) => ['analytics', 'profit-projections', serializeFilters(filters)] as const,
  newSales: (filters: Record<string, any>) => ['analytics', 'new-sales', serializeFilters(filters)] as const,
  deepDive: (filters: Record<string, any>) => ['analytics', 'deep-dive', serializeFilters(filters)] as const,
  publisherHealth: (filters: Record<string, any>) => ['analytics', 'publisher-health', serializeFilters(filters)] as const,
  salesTracking: (filters: Record<string, any>) => ['analytics', 'sales-tracking', serializeFilters(filters)] as const,

  // GCPP Check pages
  gcppMarketOverview: (filters: Record<string, any>) => ['gcpp', 'market-overview', filters] as const,
  gcppMarketBreakdown: (filters: Record<string, any>) => ['gcpp', 'market-breakdown', filters] as const,
  gcppPartnerBreakdown: (filters: Record<string, any>) => ['gcpp', 'partner-breakdown', filters] as const,
  gcppPartnerBreakdown2: (filters: Record<string, any>) => ['gcpp', 'partner-breakdown-2', filters] as const,
  gcppPublisherMonitoring: (filters: Record<string, any>) => ['gcpp', 'publisher-monitoring', filters] as const,

  // Metadata (filter options)
  metadata: (endpoint: string) => ['metadata', endpoint] as const,

  // GCPP metadata
  gcppAvailableDates: () => ['gcpp', 'available-dates'] as const,
  gcppLatestDate: () => ['gcpp', 'latest-date'] as const,

  // Pipelines
  pipelines: {
    list: (group?: string, cursor?: string | null, limit?: number) =>
      ['pipelines', { group, cursor, limit }] as const,
    lists: () => ['pipelines'] as const,
    activities: (pipelineId: string) => ['pipelines', pipelineId, 'activities'] as const,
  },
}

/**
 * Cache time configurations for different data types
 */
export const cacheConfig = {
  // Analytics data - updates once daily
  dailyAnalytics: {
    staleTime: 60 * 60 * 1000,      // 1 hour
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours
  },

  // Metadata (teams, partners, etc.) - rarely changes
  metadata: {
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    gcTime: 48 * 60 * 60 * 1000,     // 48 hours
  },

  // Available dates - new dates appear daily
  availableDates: {
    staleTime: 15 * 60 * 1000,       // 15 minutes
    gcTime: 60 * 60 * 1000,          // 1 hour
  },

  // Latest date - check more frequently
  latestDate: {
    staleTime: 10 * 60 * 1000,       // 10 minutes
    gcTime: 30 * 60 * 1000,          // 30 minutes
  },

  // Pipelines - updates frequently, moderate caching
  pipelines: {
    staleTime: 30 * 1000,            // 30 seconds (reduced from 2 minutes for fresher data)
    gcTime: 5 * 60 * 1000,           // 5 minutes
  },
}
