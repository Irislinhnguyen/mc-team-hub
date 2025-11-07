import { useState, useCallback } from 'react'

interface UseLazyTableOptions {
  endpoint?: string
  limit?: number
  autoLoad?: boolean
}

interface UseLazyTableReturn {
  data: any[]
  total: number
  loading: boolean
  offset: number
  hasMore: boolean
  loadMore: () => Promise<void>
  loadBatch: (offset: number) => Promise<void>
  reset: () => void
}

/**
 * Custom hook for lazy loading table data with pagination
 *
 * @param queryType - The type of query to execute (e.g., 'zoneMonitoringTimeSeries', 'listOfPid')
 * @param currentFilters - Current filter values to apply
 * @param options - Configuration options
 * @returns {UseLazyTableReturn} Table data state and control functions
 *
 * @example
 * const zoneTable = useLazyTable('zoneMonitoringTimeSeries', filters, { limit: 500 })
 *
 * <LazyDataTable
 *   data={zoneTable.data}
 *   onLoadMore={zoneTable.loadMore}
 *   hasMore={zoneTable.hasMore}
 *   isLoading={zoneTable.loading}
 *   totalCount={zoneTable.total}
 * />
 */
export function useLazyTable(
  queryType: string,
  currentFilters: Record<string, any>,
  options: UseLazyTableOptions = {}
): UseLazyTableReturn {
  const {
    endpoint = '/api/performance-tracker/business-health-paginated',
    limit = 500,
  } = options

  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)

  const loadBatch = useCallback(async (batchOffset: number) => {
    setLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: currentFilters,
          queryType,
          offset: batchOffset,
          limit
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${queryType} data`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        setData(prev => batchOffset === 0 ? result.data.rows : [...prev, ...result.data.rows])
        setTotal(result.data.totalCount)
        setOffset(batchOffset + result.data.rows.length)
      }
    } catch (error) {
      console.error(`Error loading ${queryType}:`, error)
    } finally {
      setLoading(false)
    }
  }, [currentFilters, queryType, endpoint, limit])

  const loadMore = useCallback(async () => {
    if (offset < total && !loading) {
      await loadBatch(offset)
    }
  }, [offset, total, loading, loadBatch])

  const reset = useCallback(() => {
    setData([])
    setTotal(0)
    setOffset(0)
    setLoading(false)
  }, [])

  const hasMore = offset < total

  return {
    data,
    total,
    loading,
    offset,
    hasMore,
    loadMore,
    loadBatch,
    reset
  }
}
