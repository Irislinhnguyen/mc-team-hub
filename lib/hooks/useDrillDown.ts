/**
 * useDrillDown Hook
 * Manages drill-down state and child entity loading for hierarchical data views
 */

import { useState, useCallback } from 'react'
import { TierType } from '../utils/tierClassification'

interface Period {
  start: string
  end: string
}

interface UseDrillDownOptions<TChild> {
  apiPath: string
  period1: Period
  period2: Period
  filters: Record<string, any>
  entityIdField?: string // Field name for entity ID (e.g., 'pic', 'team', 'product')
}

interface UseDrillDownReturn<TChild> {
  // State
  selectedTier: Record<string, TierType | null>
  childData: Record<string, TChild[]>
  loadingChildren: Record<string, boolean>

  // Actions
  loadChildren: (entityId: string, tier?: TierType | null) => Promise<void>
  handleTierSelect: (entityId: string, tier: TierType | null) => void
  clearChildren: (entityId: string) => void
  clearAll: () => void
}

/**
 * Hook for managing drill-down behavior with child entity loading
 *
 * @param options - Configuration options
 * @returns Drill-down state and control functions
 *
 * @example
 * const { childData, loadingChildren, handleTierSelect } = useDrillDown({
 *   apiPath: '/api/performance-tracker/deep-dive/pic/pids',
 *   period1,
 *   period2,
 *   filters,
 *   entityIdField: 'pic'
 * })
 */
export function useDrillDown<TChild = any>({
  apiPath,
  period1,
  period2,
  filters,
  entityIdField = 'id'
}: UseDrillDownOptions<TChild>): UseDrillDownReturn<TChild> {
  const [selectedTier, setSelectedTier] = useState<Record<string, TierType | null>>({})
  const [childData, setChildData] = useState<Record<string, TChild[]>>({})
  const [loadingChildren, setLoadingChildren] = useState<Record<string, boolean>>({})

  /**
   * Load child entities for a given parent entity
   */
  const loadChildren = useCallback(async (entityId: string, tier: TierType | null = null) => {
    setLoadingChildren(prev => ({ ...prev, [entityId]: true }))

    try {
      const requestBody: any = {
        period1,
        period2,
        filters
      }

      // Add entity ID field dynamically
      requestBody[entityIdField] = entityId

      // Add tier filter if specified
      if (tier) {
        requestBody.tier = tier
      }

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'ok' && result.data) {
        // Extract child array from result
        // API returns: { data: { pids: [...] } } or { data: { pics: [...] } } etc.
        const childArrayKey = Object.keys(result.data).find(key =>
          Array.isArray(result.data[key])
        )

        if (childArrayKey) {
          setChildData(prev => ({
            ...prev,
            [entityId]: result.data[childArrayKey]
          }))
        } else {
          console.warn('No child array found in API response:', result.data)
        }
      } else {
        throw new Error(result.message || 'Failed to load children')
      }
    } catch (error) {
      console.error(`Failed to load children for ${entityId}:`, error)
      // Set empty array on error to avoid infinite loading state
      setChildData(prev => ({ ...prev, [entityId]: [] }))
    } finally {
      setLoadingChildren(prev => ({ ...prev, [entityId]: false }))
    }
  }, [apiPath, period1, period2, filters, entityIdField])

  /**
   * Handle tier selection and reload children with tier filter
   */
  const handleTierSelect = useCallback((entityId: string, tier: TierType | null) => {
    setSelectedTier(prev => ({ ...prev, [entityId]: tier }))
    loadChildren(entityId, tier)
  }, [loadChildren])

  /**
   * Clear children data for specific entity
   */
  const clearChildren = useCallback((entityId: string) => {
    setChildData(prev => {
      const newData = { ...prev }
      delete newData[entityId]
      return newData
    })
    setSelectedTier(prev => {
      const newTier = { ...prev }
      delete newTier[entityId]
      return newTier
    })
  }, [])

  /**
   * Clear all drill-down data
   */
  const clearAll = useCallback(() => {
    setChildData({})
    setSelectedTier({})
    setLoadingChildren({})
  }, [])

  return {
    selectedTier,
    childData,
    loadingChildren,
    loadChildren,
    handleTierSelect,
    clearChildren,
    clearAll
  }
}
