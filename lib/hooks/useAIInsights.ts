/**
 * useAIInsights Hook
 * Manages AI insights state and fetching logic for executive summaries
 */

import { useState, useCallback } from 'react'

interface Period {
  start: string
  end: string
}

interface UseAIInsightsOptions {
  apiPath: string
  data: any[]
  context: {
    period1: Period
    period2: Period
    filters: Record<string, any>
  }
  summaryMode?: boolean
}

interface UseAIInsightsReturn {
  insights: string | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  clear: () => void
}

/**
 * Hook for managing AI insights for executive summaries
 *
 * @param options - Configuration options
 * @returns AI insights state and control functions
 *
 * @example
 * const { insights, loading, refresh } = useAIInsights({
 *   apiPath: '/api/performance-tracker/deep-dive/pic/ai-insights',
 *   data: picData,
 *   context: { period1, period2, filters }
 * })
 */
export function useAIInsights({
  apiPath,
  data,
  context,
  summaryMode = true
}: UseAIInsightsOptions): UseAIInsightsReturn {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!data || data.length === 0) {
      setError('No data available for AI insights')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          context,
          summaryMode
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'ok') {
        setInsights(result.insights)
      } else {
        throw new Error(result.message || 'Failed to load AI insights')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load AI insights:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [apiPath, data, context, summaryMode])

  const clear = useCallback(() => {
    setInsights(null)
    setError(null)
  }, [])

  return {
    insights,
    loading,
    error,
    refresh,
    clear
  }
}
