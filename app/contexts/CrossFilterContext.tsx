'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

export interface CrossFilter {
  field: string
  value: string
  label: string
  id?: string
}

export type FetchStrategy = 'server' | 'client'

interface CrossFilterContextType {
  crossFilters: CrossFilter[]
  addCrossFilter: (filter: CrossFilter, append?: boolean, batch?: boolean) => void
  removeCrossFilter: (field: string) => void
  clearAllCrossFilters: () => void
  hasCrossFilters: boolean
  autoEnable: boolean
  setAutoEnable: (enabled: boolean) => void
  pendingFilters: CrossFilter[]
  flushPendingFilters: () => void
  exportCrossFilters: () => CrossFilter[]
  importCrossFilters: (filters: CrossFilter[]) => void
  fetchStrategy: FetchStrategy
  setFetchStrategy: (strategy: FetchStrategy) => void
  isClientFilterMode: boolean
}

const CrossFilterContext = createContext<CrossFilterContextType | undefined>(undefined)

export function CrossFilterProvider({ children }: { children: React.ReactNode }) {
  const [crossFilters, setCrossFilters] = useState<CrossFilter[]>([])
  const [pendingFilters, setPendingFilters] = useState<CrossFilter[]>([])
  const [autoEnable, setAutoEnable] = useState(true) // Auto-enable by default
  const [fetchStrategy, setFetchStrategy] = useState<FetchStrategy>('server')

  // Restore autoEnable state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('analytics_cross_filter_enabled')
    if (stored !== null) {
      try {
        setAutoEnable(JSON.parse(stored))
      } catch (e) {
        // If parsing fails, keep default
        console.error('Failed to parse cross-filter setting from localStorage:', e)
      }
    }
  }, [])

  // Auto-detect fetch strategy based on cross-filter presence
  useEffect(() => {
    if (crossFilters.length > 0) {
      setFetchStrategy('client')
    } else {
      setFetchStrategy('server')
    }
  }, [crossFilters.length])

  const addCrossFilter = useCallback((filter: CrossFilter, append: boolean = false, batch: boolean = false) => {
    const newFilter = {
      ...filter,
      id: `${filter.field}_${filter.value}_${Date.now()}`
    }

    if (batch) {
      // Batch mode: add to pending filters (for Ctrl+multi-click scenario)
      setPendingFilters((prev) => {
        const exists = prev.some(f => f.field === filter.field && f.value === filter.value)
        if (exists) {
          // Toggle off if already in pending
          return prev.filter(f => !(f.field === filter.field && f.value === filter.value))
        }
        // Add to pending batch
        return [...prev, newFilter]
      })
    } else {
      // Immediate mode: update crossFilters directly
      setCrossFilters((prev) => {
        if (append) {
          // Add to existing filters (multi-select mode with Ctrl/Cmd)
          const exists = prev.some(f => f.field === filter.field && f.value === filter.value)
          if (exists) {
            // Filter already exists, remove it (toggle off)
            return prev.filter(f => !(f.field === filter.field && f.value === filter.value))
          }
          // Add new filter to existing ones
          const result = [...prev, newFilter]
          return result
        } else {
          // Replace all filters (default behavior)
          return [newFilter]
        }
      })
    }
  }, [])

  const flushPendingFilters = useCallback(() => {
    if (pendingFilters.length > 0) {
      setCrossFilters((prev) => {
        // Merge pending filters with existing ones
        const combined = [...prev]
        for (const pending of pendingFilters) {
          const exists = combined.some(f => f.field === pending.field && f.value === pending.value)
          if (!exists) {
            combined.push(pending)
          }
        }
        return combined
      })
      setPendingFilters([])
    }
  }, [pendingFilters])

  const removeCrossFilter = useCallback((field: string) => {
    setCrossFilters((prev) => {
      const filtered = prev.filter((f) => f.field !== field)
      return filtered
    })
  }, [])

  const clearAllCrossFilters = useCallback(() => {
    setCrossFilters([])
  }, [])

  // Export current cross-filter state (for saving to presets)
  const exportCrossFilters = useCallback(() => {
    return crossFilters.map(({ field, value, label }) => ({ field, value, label }))
  }, [crossFilters])

  // Import cross-filter state (for loading from presets)
  const importCrossFilters = useCallback((filters: CrossFilter[]) => {
    setCrossFilters(filters.map((filter, index) => ({
      ...filter,
      id: `${filter.field}_${filter.value}_${Date.now()}_${index}`
    })))
  }, [])

  const hasCrossFilters = crossFilters.length > 0
  const isClientFilterMode = fetchStrategy === 'client'

  return (
    <CrossFilterContext.Provider
      value={{
        crossFilters,
        addCrossFilter,
        removeCrossFilter,
        clearAllCrossFilters,
        hasCrossFilters,
        autoEnable,
        setAutoEnable,
        pendingFilters,
        flushPendingFilters,
        exportCrossFilters,
        importCrossFilters,
        fetchStrategy,
        setFetchStrategy,
        isClientFilterMode,
      }}
    >
      {children}
    </CrossFilterContext.Provider>
  )
}

export function useCrossFilter() {
  const context = useContext(CrossFilterContext)
  if (context === undefined) {
    throw new Error('useCrossFilter must be used within CrossFilterProvider')
  }
  return context
}
