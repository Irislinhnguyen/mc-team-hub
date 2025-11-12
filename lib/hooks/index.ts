/**
 * Centralized exports for analytics custom hooks
 *
 * These hooks provide reusable logic for common analytics page patterns:
 * - Metadata fetching
 * - Lazy table loading
 * - Date range calculations
 */

export { useAnalyticsMetadata } from './useAnalyticsMetadata'
export { useLazyTable } from './useLazyTable'
export { useDefaultDateRange } from './useDefaultDateRange'
export { useGCPPFilters } from './useGCPPFilters'

export type { MetadataOptions } from './useAnalyticsMetadata'
