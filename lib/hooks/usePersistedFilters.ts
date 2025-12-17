import { useState, useCallback } from 'react'

/**
 * usePersistedFilters - Hook for managing filter state (no localStorage persistence)
 *
 * Note: This hook no longer persists to localStorage. Use FilterPresetManager
 * for saving/loading filter configurations to the database.
 *
 * @param page - Unique page identifier (kept for API compatibility)
 * @param defaultFilters - Default filters to use on initialization
 *
 * @example
 * const [filters, setFilters] = usePersistedFilters('business-health', {
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-31',
 * })
 */
export function usePersistedFilters<T extends Record<string, any>>(
  page: string,
  defaultFilters: T
): [T, (filters: T | ((prev: T) => T)) => void, () => void] {
  // Simple state initialization (no localStorage)
  const [filters, setFiltersState] = useState<T>(defaultFilters)

  // Wrapper to handle both direct values and updater functions
  const setFilters = useCallback((newFilters: T | ((prev: T) => T)) => {
    setFiltersState(newFilters)
  }, [])

  // Reset to default filters
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters)
  }, [defaultFilters])

  return [filters, setFilters, resetFilters]
}

/**
 * Clear all persisted filters across all pages
 * Useful for "logout" or "clear all data" scenarios
 */
export function clearAllPersistedFilters() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    // Find and remove all filter-related keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('filters:')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing all persisted filters:', error)
  }
}

/**
 * Get all persisted filter keys
 * Useful for debugging or showing users what's stored
 */
export function getPersistedFilterPages(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const pages: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('filters:')) {
        pages.push(key.replace('filters:', ''))
      }
    }
    return pages
  } catch (error) {
    console.error('Error getting persisted filter pages:', error)
    return []
  }
}
