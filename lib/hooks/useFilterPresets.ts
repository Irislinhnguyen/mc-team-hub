/**
 * useFilterPresets Hook
 *
 * React hook for managing saved filter presets.
 * Provides functions to create, update, delete, and load filter presets.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FilterPreset,
  FilterPresetListResponse,
  CreateFilterPresetInput,
  UpdateFilterPresetInput,
  FilterPresetShare,
  AnalyticsPage,
} from '../types/filterPreset';
import { useAuth } from '../../app/contexts/AuthContext';

type CrossFilter = any; // TODO: Define proper CrossFilter type

interface UseFilterPresetsOptions {
  page: AnalyticsPage;
  enabled?: boolean;
  skipInitialFetch?: boolean;  // ✨ NEW: Skip initial fetch if loading preset from URL
  filterType?: 'standard' | 'advanced';  // Filter by preset type
}

interface UseFilterPresetsReturn {
  // Data
  ownPresets: FilterPreset[];
  sharedPresets: FilterPreset[];
  allPresets: FilterPreset[];
  defaultPreset: FilterPreset | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createPreset: (input: CreateFilterPresetInput) => Promise<FilterPreset>;
  updatePreset: (id: string, input: UpdateFilterPresetInput) => Promise<FilterPreset>;
  deletePreset: (id: string) => Promise<void>;
  setDefaultPreset: (id: string) => Promise<void>;
  unsetDefaultPreset: () => Promise<void>;
  sharePreset: (presetId: string, userEmail: string, permission: 'view' | 'edit') => Promise<void>;
  unsharePreset: (presetId: string, userId: string) => Promise<void>;
  getShares: (presetId: string) => Promise<FilterPresetShare[]>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage filter presets for a specific analytics page
 */
export function useFilterPresets(options: UseFilterPresetsOptions): UseFilterPresetsReturn {
  const { page, enabled = true, skipInitialFetch = false, filterType } = options;
  const { csrfToken } = useAuth();

  const [ownPresets, setOwnPresets] = useState<FilterPreset[]>([]);
  const [sharedPresets, setSharedPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch presets from API
  const fetchPresets = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const url = `/api/filter-presets?page=${page}${filterType ? `&filter_type=${filterType}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Request failed with status ${response.status}`
        }));
        throw new Error(errorData.error || 'Failed to fetch presets');
      }

      const data: FilterPresetListResponse = await response.json();
      setOwnPresets(data.own_presets);
      setSharedPresets(data.shared_presets);
    } catch (err) {
      console.error('Error fetching presets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch presets');
    } finally {
      setIsLoading(false);
    }
  }, [page, enabled]);

  // Initial fetch (skip if loading preset from URL)
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchPresets();
    } else {
      // If skipping, set loading to false immediately
      setIsLoading(false);
    }
  }, [fetchPresets, skipInitialFetch]);

  // Computed values
  const allPresets = [...ownPresets, ...sharedPresets];
  const defaultPreset = allPresets.find((p) => p.is_default) || null;

  // Create a new preset
  const createPreset = useCallback(
    async (input: CreateFilterPresetInput): Promise<FilterPreset> => {
      try {
        const response = await fetch('/api/filter-presets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'x-csrf-token': csrfToken })
          },
          credentials: 'include',
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `Request failed with status ${response.status}`
          }));
          throw new Error(errorData.error || 'Failed to create preset');
        }

        const newPreset: FilterPreset = await response.json();

        // Optimistic update
        setOwnPresets((prev) => [...prev, newPreset]);

        return newPreset;
      } catch (err) {
        console.error('Error creating preset:', err);
        throw err;
      }
    },
    [csrfToken]
  );

  // Update an existing preset
  const updatePreset = useCallback(
    async (id: string, input: UpdateFilterPresetInput): Promise<FilterPreset> => {
      try {
        const response = await fetch(`/api/filter-presets/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'x-csrf-token': csrfToken })
          },
          credentials: 'include',
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `Request failed with status ${response.status}`
          }));
          throw new Error(errorData.error || 'Failed to update preset');
        }

        const updatedPreset: FilterPreset = await response.json().catch(() => {
          throw new Error('Failed to parse server response');
        });

        // Optimistic update
        setOwnPresets((prev) => prev.map((p) => (p.id === id ? updatedPreset : p)));
        setSharedPresets((prev) => prev.map((p) => (p.id === id ? updatedPreset : p)));

        return updatedPreset;
      } catch (err) {
        console.error('Error updating preset:', err);
        throw err;
      }
    },
    [csrfToken]
  );

  // Delete a preset
  const deletePreset = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/filter-presets/${id}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken && { 'x-csrf-token': csrfToken })
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Request failed with status ${response.status}`
        }));
        throw new Error(errorData.error || 'Failed to delete preset');
      }

      // Optimistic update
      setOwnPresets((prev) => prev.filter((p) => p.id !== id));
      setSharedPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting preset:', err);
      throw err;
    }
  }, [csrfToken]);

  // Set a preset as default
  const setDefaultPreset = useCallback(
    async (id: string): Promise<void> => {
      try {
        await updatePreset(id, { is_default: true });
      } catch (err) {
        console.error('Error setting default preset:', err);
        throw err;
      }
    },
    [updatePreset]
  );

  // Unset the default preset
  const unsetDefaultPreset = useCallback(async (): Promise<void> => {
    if (!defaultPreset) return;

    try {
      await updatePreset(defaultPreset.id, { is_default: false });
    } catch (err) {
      console.error('Error unsetting default preset:', err);
      throw err;
    }
  }, [defaultPreset, updatePreset]);

  // Share a preset with another user
  const sharePreset = useCallback(
    async (presetId: string, userEmail: string, permission: 'view' | 'edit'): Promise<void> => {
      try {
        const response = await fetch(`/api/filter-presets/${presetId}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'x-csrf-token': csrfToken })
          },
          credentials: 'include',
          body: JSON.stringify({
            shared_with_user_email: userEmail,
            permission,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `Request failed with status ${response.status}`
          }));
          throw new Error(errorData.error || 'Failed to share preset');
        }

        // Update is_shared flag
        setOwnPresets((prev) =>
          prev.map((p) => (p.id === presetId ? { ...p, is_shared: true } : p))
        );
      } catch (err) {
        console.error('Error sharing preset:', err);
        throw err;
      }
    },
    [csrfToken]
  );

  // Remove a share
  const unsharePreset = useCallback(async (presetId: string, userId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/filter-presets/${presetId}/share?user_id=${userId}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken && { 'x-csrf-token': csrfToken })
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Request failed with status ${response.status}`
        }));
        throw new Error(errorData.error || 'Failed to remove share');
      }

      // Refetch to update is_shared flag correctly
      await fetchPresets();
    } catch (err) {
      console.error('Error removing share:', err);
      throw err;
    }
  }, [fetchPresets, csrfToken]);

  // Get all shares for a preset
  const getShares = useCallback(async (presetId: string): Promise<FilterPresetShare[]> => {
    try {
      const response = await fetch(`/api/filter-presets/${presetId}/share`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Request failed with status ${response.status}`
        }));
        throw new Error(errorData.error || 'Failed to fetch shares');
      }

      const shares: FilterPresetShare[] = await response.json().catch(() => {
        throw new Error('Failed to parse server response');
      });
      return shares;
    } catch (err) {
      console.error('Error fetching shares:', err);
      throw err;
    }
  }, []);

  return {
    ownPresets,
    sharedPresets,
    allPresets,
    defaultPreset,
    isLoading,
    error,
    createPreset,
    updatePreset,
    deletePreset,
    setDefaultPreset,
    unsetDefaultPreset,
    sharePreset,
    unsharePreset,
    getShares,
    refetch: fetchPresets,
  };
}

/**
 * Helper hook to detect unsaved changes in filter state
 */
export function useFilterChangesDetection(
  currentFilters: Record<string, any>,
  currentCrossFilters: CrossFilter[],
  loadedPreset: FilterPreset | null
): boolean {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!loadedPreset) {
      setHasUnsavedChanges(false);
      return;
    }

    // Deep compare filters
    const currentFiltersStr = JSON.stringify(currentFilters);
    const presetFiltersStr = JSON.stringify(loadedPreset.filters);
    const currentCrossFiltersStr = JSON.stringify(currentCrossFilters);
    const presetCrossFiltersStr = JSON.stringify(loadedPreset.cross_filters);

    const filtersChanged = currentFiltersStr !== presetFiltersStr;
    const crossFiltersChanged = currentCrossFiltersStr !== presetCrossFiltersStr;

    // Debug logging
    if (filtersChanged || crossFiltersChanged) {
      console.log('[Filter Changes Detection] Detected changes:', {
        filtersChanged,
        crossFiltersChanged,
        currentFilters: currentFiltersStr,
        presetFilters: presetFiltersStr,
        currentCrossFilters: currentCrossFiltersStr,
        presetCrossFilters: presetCrossFiltersStr,
      });
    }

    setHasUnsavedChanges(filtersChanged || crossFiltersChanged);
  }, [currentFilters, currentCrossFilters, loadedPreset]);

  return hasUnsavedChanges;
}
