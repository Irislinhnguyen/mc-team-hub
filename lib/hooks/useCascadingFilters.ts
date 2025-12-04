/**
 * Multi-Level Cascading Filters Hook
 * Handles cascading filter logic for Team → PIC → PID → MID → ZID
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MetadataOptions } from './useAnalyticsMetadata'

interface CascadingFiltersConfig {
  metadata: MetadataOptions | null
  selectedTeams: string[]
  selectedPics: string[]
  selectedPids: string[]
  selectedMids: string[]
  selectedZids: string[]
  enableCascading: boolean
}

type FilterMode = 'all' | 'filtered' | 'loading' | 'empty'

interface CascadingFiltersResult {
  availablePics: Array<{ label: string; value: string }>
  availablePids: Array<{ label: string; value: string }>
  availablePubnames: Array<{ label: string; value: string }>
  availableMids: Array<{ label: string; value: string }>
  availableMedianames: Array<{ label: string; value: string }>
  availableZids: Array<{ label: string; value: string }>
  availableZonenames: Array<{ label: string; value: string }>
  loadingStates: {
    pics: boolean
    pids: boolean
    pubnames: boolean
    mids: boolean
    medianames: boolean
    zids: boolean
    zonenames: boolean
  }
  filterModes: {
    pics: FilterMode
    pids: FilterMode
    pubnames: FilterMode
    mids: FilterMode
    medianames: FilterMode
    zids: FilterMode
    zonenames: FilterMode
  }
}

/**
 * Custom hook to manage multi-level cascading filters
 *
 * Level 1: Team → PIC (client-side, instant)
 * Level 2: PIC → PID (server-side, cached)
 * Level 3: PID → MID (server-side, cached)
 * Level 4: MID → ZID (server-side, cached)
 *
 * @example
 * const {
 *   availablePics, availablePids, availableMids, availableZids,
 *   loadingStates, filterModes
 * } = useCascadingFilters({
 *   metadata,
 *   selectedTeams: ['WEB_GTI'],
 *   selectedPics: ['John'],
 *   selectedPids: ['123'],
 *   selectedMids: ['456'],
 *   enableCascading: true
 * })
 */
export function useCascadingFilters({
  metadata,
  selectedTeams,
  selectedPics,
  selectedPids,
  selectedMids,
  selectedZids,
  enableCascading = true,
}: CascadingFiltersConfig): CascadingFiltersResult {

  // ===== Level 1: Team → PIC (Server-Side via API) =====

  const {
    data: teamMappingsData,
    isLoading: isLoadingTeamMappings,
  } = useQuery({
    queryKey: ['team-pic-mappings'],
    queryFn: async () => {
      console.log('[useCascadingFilters] 🔄 Fetching team→PIC mappings from API...')
      const response = await fetch('/api/performance-tracker/metadata/team-pic-mappings')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch team-PIC mappings`)
      }

      const result = await response.json()
      if (result.status === 'ok') {
        console.log('[useCascadingFilters] ✅ Team→PIC mappings loaded:', Object.keys(result.data).length, 'teams')

        // Debug: Show what was loaded
        Object.entries(result.data).forEach(([teamId, pics]: [string, any]) => {
          console.log(`   - Team "${teamId}": ${pics.length} PICs`)
        })

        return result.data as Record<string, string[]>
      }
      throw new Error(result.message || 'Failed to fetch team-PIC mappings')
    },
    enabled: enableCascading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Convert API response to Map
  const teamPicMappings = useMemo(() => {
    if (!teamMappingsData) return new Map<string, string[]>()
    return new Map(Object.entries(teamMappingsData))
  }, [teamMappingsData])

  const teamMappingsLoaded = !isLoadingTeamMappings && teamPicMappings.size > 0

  const availablePics = useMemo(() => {
    if (!enableCascading || !metadata) return metadata?.pics || []
    if (selectedTeams.length === 0) return metadata.pics

    // Wait for team mappings to load
    if (!teamMappingsLoaded || teamPicMappings.size === 0) {
      console.log('[useCascadingFilters] ⏳ Team mappings not loaded yet, showing all PICs (loaded:', teamMappingsLoaded, ', size:', teamPicMappings.size, ')')
      return metadata.pics
    }

    // Union of PICs from all selected teams
    const picSet = new Set<string>()
    selectedTeams.forEach((teamId) => {
      const teamPics = teamPicMappings.get(teamId) || []
      console.log(`[useCascadingFilters] 🔍 Team "${teamId}" → ${teamPics.length} PICs: ${teamPics.slice(0, 3).join(', ')}${teamPics.length > 3 ? '...' : ''}`)
      teamPics.forEach((pic) => picSet.add(pic))
    })

    // Filter metadata PICs to only include those in selected teams
    const filtered = metadata.pics.filter((pic) => picSet.has(pic.value))
    console.log(`[useCascadingFilters] ✅ Team→PIC filter: ${selectedTeams.length} teams → ${filtered.length} PICs (from ${picSet.size} unique)`)

    if (filtered.length === 0 && picSet.size > 0) {
      console.warn('[useCascadingFilters] ⚠️ No PICs found in metadata matching team mappings!')
      console.warn('[useCascadingFilters]    Team PICs:', Array.from(picSet).slice(0, 5))
      console.warn('[useCascadingFilters]    Metadata PICs sample:', metadata.pics.slice(0, 5).map(p => p.value))
    }

    return filtered
  }, [enableCascading, metadata, selectedTeams, teamPicMappings, teamMappingsLoaded])

  // ===== Level 2: PIC → PID (Server-Side) =====

  const shouldFetchPids = enableCascading && selectedPics.length > 0

  const {
    data: fetchedPids,
    isLoading: isLoadingPids,
  } = useQuery({
    queryKey: ['cascading-pids', selectedPics.sort().join('|')],
    queryFn: async () => {
      const picsParam = selectedPics.join(',')
      const response = await fetch(
        `/api/performance-tracker/metadata/pids-for-pics?pics=${encodeURIComponent(picsParam)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch PIDs`)
      }

      const result = await response.json()
      if (result.status === 'ok') {
        console.log('[useCascadingFilters] PIC→PID:', selectedPics.length, 'PICs →', result.data.length, 'PIDs')
        return result.data as Array<{ label: string; value: string }>
      }
      throw new Error(result.message || 'Failed to fetch PIDs')
    },
    enabled: shouldFetchPids,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const availablePids = useMemo(() => {
    if (!enableCascading || !metadata) return metadata?.pids || []
    if (selectedPics.length === 0) return metadata.pids
    if (isLoadingPids) return metadata.pids  // Keep showing all during load
    return fetchedPids || []
  }, [enableCascading, metadata, selectedPics.length, isLoadingPids, fetchedPids])

  // ===== Level 3: PID → MID (Server-Side) =====

  const shouldFetchMids = enableCascading && selectedPids.length > 0

  const {
    data: fetchedMids,
    isLoading: isLoadingMids,
  } = useQuery({
    queryKey: ['cascading-mids', selectedPids.sort().join('|')],
    queryFn: async () => {
      const pidsParam = selectedPids.join(',')
      const response = await fetch(
        `/api/performance-tracker/metadata/mids-for-pids?pids=${encodeURIComponent(pidsParam)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch MIDs`)
      }

      const result = await response.json()
      if (result.status === 'ok') {
        console.log('[useCascadingFilters] PID→MID:', selectedPids.length, 'PIDs →', result.data.length, 'MIDs')
        return result.data as Array<{ label: string; value: string }>
      }
      throw new Error(result.message || 'Failed to fetch MIDs')
    },
    enabled: shouldFetchMids,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const availableMids = useMemo(() => {
    if (!enableCascading || !metadata) return metadata?.mids || []
    if (selectedPids.length === 0) return metadata.mids
    if (isLoadingMids) return metadata.mids  // Keep showing all during load
    return fetchedMids || []
  }, [enableCascading, metadata, selectedPids.length, isLoadingMids, fetchedMids])

  // ===== Level 4: MID → ZID (Server-Side) =====

  const shouldFetchZids = enableCascading && selectedMids.length > 0

  const {
    data: fetchedZids,
    isLoading: isLoadingZids,
  } = useQuery({
    queryKey: ['cascading-zids', selectedMids.sort().join('|')],
    queryFn: async () => {
      const midsParam = selectedMids.join(',')
      const response = await fetch(
        `/api/performance-tracker/metadata/zids-for-mids?mids=${encodeURIComponent(midsParam)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch ZIDs`)
      }

      const result = await response.json()
      if (result.status === 'ok') {
        console.log('[useCascadingFilters] MID→ZID:', selectedMids.length, 'MIDs →', result.data.length, 'ZIDs')
        return result.data as Array<{ label: string; value: string }>
      }
      throw new Error(result.message || 'Failed to fetch ZIDs')
    },
    enabled: shouldFetchZids,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const availableZids = useMemo(() => {
    if (!enableCascading || !metadata) return metadata?.zids || []
    if (selectedMids.length === 0) return metadata.zids
    if (isLoadingZids) return metadata.zids  // Keep showing all during load
    return fetchedZids || []
  }, [enableCascading, metadata, selectedMids.length, isLoadingZids, fetchedZids])

  // ===== Name Fields: PID → Pubname (Server-Side) =====

  const shouldFetchPubnames = enableCascading && selectedPids.length > 0

  const {
    data: fetchedPubnames,
    isLoading: isLoadingPubnames,
  } = useQuery({
    queryKey: ['cascading-pubnames', selectedPids.sort().join('|')],
    queryFn: async () => {
      const pidsParam = selectedPids.join(',')
      const response = await fetch(
        `/api/performance-tracker/metadata/pubnames-for-pids?pids=${encodeURIComponent(pidsParam)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch pubnames`)
      }

      const result = await response.json()
      if (result.status === 'ok') {
        console.log('[useCascadingFilters] PID→pubname:', selectedPids.length, 'PIDs →', result.data.length, 'pubnames')
        return result.data as Array<{ label: string; value: string }>
      }
      throw new Error(result.message || 'Failed to fetch pubnames')
    },
    enabled: shouldFetchPubnames,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const availablePubnames = useMemo(() => {
    if (!enableCascading || !metadata) return metadata?.pubnames || []
    if (selectedPids.length === 0) return metadata.pubnames
    if (isLoadingPubnames) return metadata.pubnames  // Keep showing all during load
    return fetchedPubnames || []
  }, [enableCascading, metadata, selectedPids.length, isLoadingPubnames, fetchedPubnames])

  // ===== Name Fields: MID → Medianame (Server-Side) =====

  const shouldFetchMedianames = enableCascading && selectedMids.length > 0

  const {
    data: fetchedMedianames,
    isLoading: isLoadingMedianames,
  } = useQuery({
    queryKey: ['cascading-medianames', selectedMids.sort().join('|')],
    queryFn: async () => {
      const midsParam = selectedMids.join(',')
      const response = await fetch(
        `/api/performance-tracker/metadata/medianames-for-mids?mids=${encodeURIComponent(midsParam)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch medianames`)
      }

      const result = await response.json()
      if (result.status === 'ok') {
        console.log('[useCascadingFilters] MID→medianame:', selectedMids.length, 'MIDs →', result.data.length, 'medianames')
        return result.data as Array<{ label: string; value: string }>
      }
      throw new Error(result.message || 'Failed to fetch medianames')
    },
    enabled: shouldFetchMedianames,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const availableMedianames = useMemo(() => {
    if (!enableCascading || !metadata) return metadata?.medianames || []
    if (selectedMids.length === 0) return metadata.medianames
    if (isLoadingMedianames) return metadata.medianames  // Keep showing all during load
    return fetchedMedianames || []
  }, [enableCascading, metadata, selectedMids.length, isLoadingMedianames, fetchedMedianames])

  // ===== Name Fields: ZID → Zonename (Server-Side) =====

  const shouldFetchZonenames = enableCascading && selectedZids.length > 0

  const {
    data: fetchedZonenames,
    isLoading: isLoadingZonenames,
  } = useQuery({
    queryKey: ['cascading-zonenames', selectedZids.sort().join('|')],
    queryFn: async () => {
      const zidsParam = selectedZids.join(',')
      const response = await fetch(
        `/api/performance-tracker/metadata/zonenames-for-zids?zids=${encodeURIComponent(zidsParam)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch zonenames`)
      }

      const result = await response.json()
      if (result.status === 'ok') {
        console.log('[useCascadingFilters] ZID→zonename:', selectedZids.length, 'ZIDs →', result.data.length, 'zonenames')
        return result.data as Array<{ label: string; value: string }>
      }
      throw new Error(result.message || 'Failed to fetch zonenames')
    },
    enabled: shouldFetchZonenames,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const availableZonenames = useMemo(() => {
    if (!enableCascading || !metadata) return metadata?.zonenames || []
    if (selectedZids.length === 0) return metadata.zonenames
    if (isLoadingZonenames) return metadata.zonenames  // Keep showing all during load
    return fetchedZonenames || []
  }, [enableCascading, metadata, selectedZids.length, isLoadingZonenames, fetchedZonenames])

  // ===== Determine Filter Modes =====

  const filterModes = useMemo(() => {
    return {
      pics:
        selectedTeams.length === 0 ? 'all' as FilterMode :
        !teamMappingsLoaded ? 'loading' as FilterMode :
        availablePics.length === 0 ? 'empty' as FilterMode : 'filtered' as FilterMode,
      pids:
        selectedPics.length === 0 ? 'all' as FilterMode :
        isLoadingPids ? 'loading' as FilterMode :
        availablePids.length === 0 ? 'empty' as FilterMode : 'filtered' as FilterMode,
      pubnames:
        selectedPids.length === 0 ? 'all' as FilterMode :
        isLoadingPubnames ? 'loading' as FilterMode :
        availablePubnames.length === 0 ? 'empty' as FilterMode : 'filtered' as FilterMode,
      mids:
        selectedPids.length === 0 ? 'all' as FilterMode :
        isLoadingMids ? 'loading' as FilterMode :
        availableMids.length === 0 ? 'empty' as FilterMode : 'filtered' as FilterMode,
      medianames:
        selectedMids.length === 0 ? 'all' as FilterMode :
        isLoadingMedianames ? 'loading' as FilterMode :
        availableMedianames.length === 0 ? 'empty' as FilterMode : 'filtered' as FilterMode,
      zids:
        selectedMids.length === 0 ? 'all' as FilterMode :
        isLoadingZids ? 'loading' as FilterMode :
        availableZids.length === 0 ? 'empty' as FilterMode : 'filtered' as FilterMode,
      zonenames:
        selectedZids.length === 0 ? 'all' as FilterMode :
        isLoadingZonenames ? 'loading' as FilterMode :
        availableZonenames.length === 0 ? 'empty' as FilterMode : 'filtered' as FilterMode,
    }
  }, [
    selectedTeams.length, teamMappingsLoaded, availablePics.length,
    selectedPics.length, isLoadingPids, availablePids.length,
    selectedPids.length, isLoadingPubnames, availablePubnames.length,
    isLoadingMids, availableMids.length,
    selectedMids.length, isLoadingMedianames, availableMedianames.length,
    isLoadingZids, availableZids.length,
    selectedZids.length, isLoadingZonenames, availableZonenames.length,
  ])

  return {
    availablePics,
    availablePids,
    availablePubnames,
    availableMids,
    availableMedianames,
    availableZids,
    availableZonenames,
    loadingStates: {
      pics: isLoadingTeamMappings, // Loading team mappings from API
      pids: isLoadingPids,
      pubnames: isLoadingPubnames,
      mids: isLoadingMids,
      medianames: isLoadingMedianames,
      zids: isLoadingZids,
      zonenames: isLoadingZonenames,
    },
    filterModes,
  }
}
