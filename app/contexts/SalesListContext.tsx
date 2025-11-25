'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  SalesList,
  SalesListWithStats,
  SalesListItemSummary,
  SalesListActivity,
  CreateSalesListInput,
  UpdateSalesListInput,
  AddListItemInput,
  LogActivityInput,
  UpdateActivityInput,
  ShareListInput,
} from '@/lib/types/salesLists'

interface SalesListContextType {
  // State
  lists: SalesListWithStats[]
  selectedListId: string | null
  selectedItems: Set<string>
  isLoading: boolean
  error: string | null

  // List CRUD
  fetchLists: () => Promise<void>
  createList: (data: CreateSalesListInput) => Promise<SalesList>
  updateList: (id: string, data: UpdateSalesListInput) => Promise<void>
  deleteList: (id: string) => Promise<void>
  setSelectedListId: (id: string | null) => void

  // Item management
  fetchListItems: (listId: string) => Promise<SalesListItemSummary[]>
  addItems: (listId: string, items: AddListItemInput[]) => Promise<void>
  removeItem: (listId: string, itemId: string) => Promise<void>

  // Activity logging
  fetchActivities: (listId: string, itemId: string) => Promise<SalesListActivity[]>
  logActivity: (listId: string, itemId: string, data: LogActivityInput) => Promise<void>
  updateActivity: (listId: string, itemId: string, activityId: string, data: UpdateActivityInput) => Promise<void>
  deleteActivity: (listId: string, itemId: string, activityId: string) => Promise<void>

  // Sharing
  shareList: (listId: string, data: ShareListInput) => Promise<void>
  updateShare: (listId: string, shareId: string, permission: 'view' | 'edit') => Promise<void>
  removeShare: (listId: string, shareId: string) => Promise<void>

  // Selection state (for bulk actions)
  toggleItemSelection: (itemId: string) => void
  clearSelection: () => void
  selectAll: (itemIds: string[]) => void
}

const SalesListContext = createContext<SalesListContextType | undefined>(undefined)

export function SalesListProvider({ children }: { children: ReactNode }) {
  const { csrfToken } = useAuth()
  const [lists, setLists] = useState<SalesListWithStats[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper for API calls with CSRF
  const apiCall = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      }

      if (csrfToken && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
        headers['X-CSRF-Token'] = csrfToken
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return response.json()
    },
    [csrfToken]
  )

  // Fetch all lists
  const fetchLists = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiCall('/api/sales-lists')
      const allLists = [...(data.own_lists || []), ...(data.shared_lists || [])]
      setLists(allLists)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lists')
      console.error('Error fetching lists:', err)
    } finally {
      setIsLoading(false)
    }
  }, [apiCall])

  // Create list
  const createList = useCallback(
    async (data: CreateSalesListInput): Promise<SalesList> => {
      const result = await apiCall('/api/sales-lists', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      await fetchLists()
      return result
    },
    [apiCall, fetchLists]
  )

  // Update list
  const updateList = useCallback(
    async (id: string, data: UpdateSalesListInput) => {
      await apiCall(`/api/sales-lists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      await fetchLists()
    },
    [apiCall, fetchLists]
  )

  // Delete list
  const deleteList = useCallback(
    async (id: string) => {
      await apiCall(`/api/sales-lists/${id}`, {
        method: 'DELETE',
      })
      await fetchLists()
      if (selectedListId === id) {
        setSelectedListId(null)
      }
    },
    [apiCall, fetchLists, selectedListId]
  )

  // Fetch list items
  const fetchListItems = useCallback(
    async (listId: string): Promise<SalesListItemSummary[]> => {
      const data = await apiCall(`/api/sales-lists/${listId}/items`)
      return data.items || []
    },
    [apiCall]
  )

  // Add items
  const addItems = useCallback(
    async (listId: string, items: AddListItemInput[]) => {
      await apiCall(`/api/sales-lists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      })
      await fetchLists()
    },
    [apiCall, fetchLists]
  )

  // Remove item
  const removeItem = useCallback(
    async (listId: string, itemId: string) => {
      await apiCall(`/api/sales-lists/${listId}/items/${itemId}`, {
        method: 'DELETE',
      })
      await fetchLists()
    },
    [apiCall, fetchLists]
  )

  // Fetch activities
  const fetchActivities = useCallback(
    async (listId: string, itemId: string): Promise<SalesListActivity[]> => {
      const data = await apiCall(`/api/sales-lists/${listId}/items/${itemId}/activities`)
      return data.activities || []
    },
    [apiCall]
  )

  // Log activity
  const logActivity = useCallback(
    async (listId: string, itemId: string, data: LogActivityInput) => {
      await apiCall(`/api/sales-lists/${listId}/items/${itemId}/activities`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    [apiCall]
  )

  // Update activity
  const updateActivity = useCallback(
    async (listId: string, itemId: string, activityId: string, data: UpdateActivityInput) => {
      await apiCall(`/api/sales-lists/${listId}/items/${itemId}/activities/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    [apiCall]
  )

  // Delete activity
  const deleteActivity = useCallback(
    async (listId: string, itemId: string, activityId: string) => {
      await apiCall(`/api/sales-lists/${listId}/items/${itemId}/activities/${activityId}`, {
        method: 'DELETE',
      })
    },
    [apiCall]
  )

  // Share list
  const shareList = useCallback(
    async (listId: string, data: ShareListInput) => {
      await apiCall(`/api/sales-lists/${listId}/share`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    [apiCall]
  )

  // Update share
  const updateShare = useCallback(
    async (listId: string, shareId: string, permission: 'view' | 'edit') => {
      await apiCall(`/api/sales-lists/${listId}/share/${shareId}`, {
        method: 'PUT',
        body: JSON.stringify({ permission }),
      })
    },
    [apiCall]
  )

  // Remove share
  const removeShare = useCallback(
    async (listId: string, shareId: string) => {
      await apiCall(`/api/sales-lists/${listId}/share/${shareId}`, {
        method: 'DELETE',
      })
    },
    [apiCall]
  )

  // Selection management
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  const selectAll = useCallback((itemIds: string[]) => {
    setSelectedItems(new Set(itemIds))
  }, [])

  const value: SalesListContextType = {
    lists,
    selectedListId,
    selectedItems,
    isLoading,
    error,
    fetchLists,
    createList,
    updateList,
    deleteList,
    setSelectedListId,
    fetchListItems,
    addItems,
    removeItem,
    fetchActivities,
    logActivity,
    updateActivity,
    deleteActivity,
    shareList,
    updateShare,
    removeShare,
    toggleItemSelection,
    clearSelection,
    selectAll,
  }

  return <SalesListContext.Provider value={value}>{children}</SalesListContext.Provider>
}

export function useSalesList() {
  const context = useContext(SalesListContext)
  if (context === undefined) {
    throw new Error('useSalesList must be used within a SalesListProvider')
  }
  return context
}
