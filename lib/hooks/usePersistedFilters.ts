import { useState, useEffect, useCallback } from 'react'

/**
 * usePersistedFilters - Hook to persist filter state per page in localStorage
 *
 * Enables "remember last filters per tab" functionality.
 * Each page maintains its own filter state that persists across:
 * - Tab switches
 * - Page refreshes
 * - Browser sessions
 *
 * @param page - Unique page identifier (e.g., 'business-health', 'daily-ops')
 * @param defaultFilters - Default filters to use if no saved state exists
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
  const storageKey = `filters:${page}`

  // Initialize state from localStorage or defaults
  const [filters, setFiltersState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultFilters
    }

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults to ensure all required fields exist
        return { ...defaultFilters, ...parsed }
      }
    } catch (error) {
      console.error(`Error loading persisted filters for ${page}:`, error)
    }

    return defaultFilters
  })

  // Save to localStorage whenever filters change (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Debounce saves to avoid excessive localStorage writes
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters))
      } catch (error) {
        console.error(`Error persisting filters for ${page}:`, error)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [filters, page, storageKey])

  // Wrapper to handle both direct values and updater functions
  const setFilters = useCallback((newFilters: T | ((prev: T) => T)) => {
    setFiltersState(newFilters)
  }, [])

  // Reset to default filters
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error(`Error resetting filters for ${page}:`, error)
    }
  }, [defaultFilters, page, storageKey])

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
