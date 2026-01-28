/**
 * Multi-Level Cascading Filters Hook (Looker Studio-style)
 *
 * Full bidirectional cascading using client-side relationship mapping.
 * When ANY filter is selected, ALL other filters constrain automatically.
 *
 * Architecture:
 * - Single API call on mount (fetches relationship map)
 * - Zero API calls on filter changes (all client-side)
 * - Intersection logic computes valid options at each level
 * - Prevents invalid selections entirely (strict mode)
 */

import { useMemo } from 'react'
import { useRelationshipMap, intersect } from './useRelationshipMap'
import type { MetadataOptions } from './useAnalyticsMetadata'

interface CascadingFiltersConfig {
  metadata: MetadataOptions | null
  selectedTeams: string[]
  selectedPics: string[]
  selectedPids: string[]
  selectedPubnames: string[]
  selectedMids: string[]
  selectedMedianames: string[]
  selectedZids: string[]
  selectedZonenames: string[]
  selectedProducts: string[]
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
  availableProducts: Array<{ label: string; value: string }>
  loadingStates: {
    pics: boolean
    pids: boolean
    pubnames: boolean
    mids: boolean
    medianames: boolean
    zids: boolean
    zonenames: boolean
    products: boolean
  }
  filterModes: {
    pics: FilterMode
    pids: FilterMode
    pubnames: FilterMode
    mids: FilterMode
    medianames: FilterMode
    zids: FilterMode
    zonenames: FilterMode
    products: FilterMode
  }
}

/**
 * useCascadingFilters - Full bidirectional cascading with intersection logic
 *
 * Example flow when user selects pubname "24h.com.vn":
 * 1. pubname → PIDs (reverse lookup)
 * 2. PIDs → PICs (reverse cascade up)
 * 3. PIDs → MIDs (forward cascade down)
 * 4. MIDs → ZIDs (forward cascade down)
 * 5. ZIDs → Products (forward cascade down)
 *
 * Result: All filters show only valid options for "24h.com.vn"
 */
export function useCascadingFilters({
  metadata,
  selectedTeams,
  selectedPics,
  selectedPids,
  selectedPubnames,
  selectedMids,
  selectedMedianames,
  selectedZids,
  selectedZonenames,
  selectedProducts,
  enableCascading = true,
}: CascadingFiltersConfig): CascadingFiltersResult {

  // Get relationship map with helper methods
  const relationshipMap = useRelationshipMap(metadata)

  /**
   * CORE LOGIC: Compute valid IDs at each level based on ALL selections
   *
   * Uses intersection logic - starts with ALL possible values,
   * then applies constraints from each active filter selection.
   */
  const computedIds = useMemo(() => {
    // If cascading disabled or no relationship map, return all metadata values
    if (!enableCascading || !relationshipMap || !metadata) {
      return {
        validPics: new Set(metadata?.pics?.map(p => p.value) || []),
        validPids: new Set(metadata?.pids?.map(p => p.value) || []),
        validMids: new Set(metadata?.mids?.map(m => m.value) || []),
        validZids: new Set(metadata?.zids?.map(z => z.value) || []),
        validProducts: new Set(metadata?.products?.map(p => p.value) || []),
      }
    }

    // Start with ALL possible values at each level
    let validPics = new Set(metadata.pics?.map(p => p.value) || [])
    let validPids = new Set(metadata.pids?.map(p => p.value) || [])
    let validMids = new Set(metadata.mids?.map(m => m.value) || [])
    let validZids = new Set(metadata.zids?.map(z => z.value) || [])
    let validProducts = new Set(metadata.products?.map(p => p.value) || [])

    console.log('[useCascadingFilters] Starting intersection logic...')
    console.log('[useCascadingFilters] Initial counts:', {
      pics: validPics.size,
      pids: validPids.size,
      mids: validMids.size,
      zids: validZids.size,
      products: validProducts.size,
    })

    // CONSTRAINT 1: Team selection (top-level filter)
    if (selectedTeams.length > 0) {
      const picsFromTeams = relationshipMap.getPicsFromTeams(selectedTeams)
      validPics = new Set(picsFromTeams)
      console.log('[useCascadingFilters] Team constraint:', selectedTeams, '→', validPics.size, 'PICs')
    }

    // CONSTRAINT 2: Direct PIC selection (cascade down ENTIRE chain)
    if (selectedPics.length > 0) {
      // Don't self-constrain validPics - keep ALL PICs visible for multi-select
      const pidsFromPics = relationshipMap.getPidsFromPics(selectedPics)
      validPids = intersect(validPids, pidsFromPics)

      // Cascade down to MIDs
      const midsFromPids = relationshipMap.getMidsFromPids(Array.from(validPids))
      validMids = intersect(validMids, midsFromPids)

      // Cascade down to ZIDs
      const zidsFromMids = relationshipMap.getZidsFromMids(Array.from(validMids))
      validZids = intersect(validZids, zidsFromMids)

      // Cascade down to Products
      const productsFromZids = relationshipMap.getProductsFromZids(Array.from(validZids))
      validProducts = intersect(validProducts, productsFromZids)

      console.log('[useCascadingFilters] PIC constraint:', selectedPics.length, 'PICs selected →', validPids.size, 'PIDs,', validMids.size, 'MIDs,', validZids.size, 'ZIDs,', validProducts.size, 'Products')
    }

    // 🔴 FIX: Save validPids BEFORE pubname constraint for availablePubnames calculation
    const validPidsBeforePubname = new Set(validPids)

    // CONSTRAINT 3: Pubname selection (reverse to PIDs, NO upstream cascade)
    if (selectedPubnames.length > 0) {
      const pidsFromPubnames = relationshipMap.getPidsFromPubnames(selectedPubnames)
      validPids = intersect(validPids, pidsFromPubnames)

      console.log('[useCascadingFilters] Pubname constraint:', selectedPubnames.length, '→', validPids.size, 'PIDs')
    }

    // CONSTRAINT 4: Direct PID selection (cascade down only - NO upstream)
    if (selectedPids.length > 0) {
      // Don't self-constrain validPids - keep ALL PIDs visible for multi-select
      const midsFromPids = relationshipMap.getMidsFromPids(selectedPids)
      validMids = intersect(validMids, midsFromPids)

      // Cascade down to ZIDs
      const zidsFromMids = relationshipMap.getZidsFromMids(Array.from(validMids))
      validZids = intersect(validZids, zidsFromMids)

      // Cascade down to Products
      const productsFromZids = relationshipMap.getProductsFromZids(Array.from(validZids))
      validProducts = intersect(validProducts, productsFromZids)

      console.log('[useCascadingFilters] PID constraint:', selectedPids.length, '→', validMids.size, 'MIDs,', validZids.size, 'ZIDs,', validProducts.size, 'Products')
    }

    // 🔴 FIX: Save validMids BEFORE medianame constraint for availableMedianames calculation
    const validMidsBeforeMedianame = new Set(validMids)

    // CONSTRAINT 5: Medianame selection (reverse to MIDs, NO upstream cascade)
    if (selectedMedianames.length > 0) {
      const midsFromMedianames = relationshipMap.getMidsFromMedianames(selectedMedianames)
      validMids = intersect(validMids, midsFromMedianames)

      console.log('[useCascadingFilters] Medianame constraint:', selectedMedianames.length, '→', validMids.size, 'MIDs')
    }

    // CONSTRAINT 6: Direct MID selection (cascade down only - NO upstream)
    if (selectedMids.length > 0) {
      // Don't self-constrain validMids - keep ALL MIDs visible for multi-select
      const zidsFromMids = relationshipMap.getZidsFromMids(selectedMids)
      validZids = intersect(validZids, zidsFromMids)

      // Cascade down to Products
      const productsFromZids = relationshipMap.getProductsFromZids(Array.from(validZids))
      validProducts = intersect(validProducts, productsFromZids)

      console.log('[useCascadingFilters] MID constraint:', selectedMids.length, '→', validZids.size, 'ZIDs,', validProducts.size, 'Products')
    }

    // 🔴 FIX: Save validZids BEFORE zonename constraint for availableZonenames calculation
    const validZidsBeforeZonename = new Set(validZids)

    // CONSTRAINT 7: Zonename selection (reverse to ZIDs, NO upstream cascade)
    if (selectedZonenames.length > 0) {
      const zidsFromZonenames = relationshipMap.getZidsFromZonenames(selectedZonenames)
      validZids = intersect(validZids, zidsFromZonenames)

      console.log('[useCascadingFilters] Zonename constraint:', selectedZonenames.length, '→', validZids.size, 'ZIDs')
    }

    // CONSTRAINT 8: Direct ZID selection (cascade down only - NO upstream)
    if (selectedZids.length > 0) {
      // Don't self-constrain validZids - keep ALL ZIDs visible for multi-select
      const productsFromZids = relationshipMap.getProductsFromZids(selectedZids)
      validProducts = intersect(validProducts, productsFromZids)

      console.log('[useCascadingFilters] ZID constraint:', selectedZids.length, '→', validProducts.size, 'Products')
    }

    // CONSTRAINT 9: Product selection (NO upstream cascade - bottom level)
    if (selectedProducts.length > 0) {
      // Don't self-constrain validProducts - keep ALL Products visible for multi-select
      // No downstream cascade (Product is bottom level)
      console.log('[useCascadingFilters] Product constraint:', selectedProducts.length, 'Products selected (no cascade)')
    }

    console.log('[useCascadingFilters] Final valid counts:', {
      pics: validPics.size,
      pids: validPids.size,
      mids: validMids.size,
      zids: validZids.size,
      products: validProducts.size,
    })

    return {
      validPics,
      validPids,
      validMids,
      validZids,
      validProducts,
      // 🔴 FIX: Pre-constraint states for name field dropdowns (prevent self-constraining)
      validPidsBeforePubname,
      validMidsBeforeMedianame,
      validZidsBeforeZonename,
    }
  }, [
    enableCascading,
    relationshipMap,
    metadata,
    selectedTeams,
    selectedPics,
    selectedPids,
    selectedPubnames,
    selectedMids,
    selectedMedianames,
    selectedZids,
    selectedZonenames,
    selectedProducts,
  ])

  /**
   * Convert computed valid IDs to available options
   * Simple filtering of metadata using computed sets
   */

  const availablePics = useMemo(() => {
    if (!metadata?.pics) return []
    return metadata.pics.filter(p => computedIds.validPics.has(p.value))
  }, [metadata?.pics, computedIds.validPics])

  const availablePids = useMemo(() => {
    if (!metadata?.pids) return []
    // 🔴 FIX: Use validPidsBeforePubname to prevent constraining by pubname selection
    return metadata.pids.filter(p => computedIds.validPidsBeforePubname.has(p.value))
  }, [metadata?.pids, computedIds.validPidsBeforePubname])

  const availableMids = useMemo(() => {
    if (!metadata?.mids) return []
    // 🔴 FIX: Use validMidsBeforeMedianame to prevent constraining by medianame selection
    return metadata.mids.filter(m => computedIds.validMidsBeforeMedianame.has(m.value))
  }, [metadata?.mids, computedIds.validMidsBeforeMedianame])

  const availableZids = useMemo(() => {
    if (!metadata?.zids) return []
    // 🔴 FIX: Use validZidsBeforeZonename to prevent constraining by zonename selection
    return metadata.zids.filter(z => computedIds.validZidsBeforeZonename.has(z.value))
  }, [metadata?.zids, computedIds.validZidsBeforeZonename])

  const availableProducts = useMemo(() => {
    if (!metadata?.products) return []
    return metadata.products.filter(p => computedIds.validProducts.has(p.value))
  }, [metadata?.products, computedIds.validProducts])

  /**
   * Name field options - computed from valid IDs at each level
   */

  const availablePubnames = useMemo(() => {
    if (!metadata?.pubnames || !relationshipMap) return metadata?.pubnames || []

    // 🔴 FIX: Use validPidsBeforePubname to prevent self-constraining
    // This allows multi-select of pubnames without dropdown shrinking to only selected items
    const validPubnames = new Set<string>()
    Array.from(computedIds.validPidsBeforePubname).forEach(pid => {
      const pubnames = relationshipMap.getPubnamesFromPids([pid])
      pubnames.forEach(pn => validPubnames.add(pn))
    })

    return metadata.pubnames.filter(pn => validPubnames.has(pn.value))
  }, [metadata?.pubnames, computedIds.validPidsBeforePubname, relationshipMap])

  const availableMedianames = useMemo(() => {
    if (!metadata?.medianames || !relationshipMap) return metadata?.medianames || []

    // 🔴 FIX: Use validMidsBeforeMedianame to prevent self-constraining
    // This allows multi-select of medianames without dropdown shrinking to only selected items
    const validMedianames = new Set<string>()
    Array.from(computedIds.validMidsBeforeMedianame).forEach(mid => {
      const medianames = relationshipMap.getMedianamesFromMids([mid])
      medianames.forEach(mn => validMedianames.add(mn))
    })

    return metadata.medianames.filter(mn => validMedianames.has(mn.value))
  }, [metadata?.medianames, computedIds.validMidsBeforeMedianame, relationshipMap])

  const availableZonenames = useMemo(() => {
    if (!metadata?.zonenames || !relationshipMap) return metadata?.zonenames || []

    // 🔴 FIX: Use validZidsBeforeZonename to prevent self-constraining
    // This allows multi-select of zonenames without dropdown shrinking to only selected items
    const validZonenames = new Set<string>()
    Array.from(computedIds.validZidsBeforeZonename).forEach(zid => {
      const zonenames = relationshipMap.getZonenamesFromZids([zid])
      zonenames.forEach(zn => validZonenames.add(zn))
    })

    return metadata.zonenames.filter(zn => validZonenames.has(zn.value))
  }, [metadata?.zonenames, computedIds.validZidsBeforeZonename, relationshipMap])

  /**
   * Loading states - simplified (only metadata loading matters now)
   */
  const loadingStates = useMemo(() => {
    const metadataLoading = !metadata || !relationshipMap
    return {
      pics: metadataLoading,
      pids: metadataLoading,
      pubnames: metadataLoading,
      mids: metadataLoading,
      medianames: metadataLoading,
      zids: metadataLoading,
      zonenames: metadataLoading,
      products: metadataLoading,
    }
  }, [metadata, relationshipMap])

  /**
   * Filter modes - computed from available vs total counts
   */
  const filterModes = useMemo(() => {
    const getMode = (available: number, total: number): FilterMode => {
      if (loadingStates.pics) return 'loading'
      if (available === 0) return 'empty'
      if (available < total) return 'filtered'
      return 'all'
    }

    return {
      pics: getMode(availablePics.length, metadata?.pics?.length || 0),
      pids: getMode(availablePids.length, metadata?.pids?.length || 0),
      pubnames: getMode(availablePubnames.length, metadata?.pubnames?.length || 0),
      mids: getMode(availableMids.length, metadata?.mids?.length || 0),
      medianames: getMode(availableMedianames.length, metadata?.medianames?.length || 0),
      zids: getMode(availableZids.length, metadata?.zids?.length || 0),
      zonenames: getMode(availableZonenames.length, metadata?.zonenames?.length || 0),
      products: getMode(availableProducts.length, metadata?.products?.length || 0),
    }
  }, [
    availablePics.length,
    availablePids.length,
    availablePubnames.length,
    availableMids.length,
    availableMedianames.length,
    availableZids.length,
    availableZonenames.length,
    availableProducts.length,
    metadata,
    loadingStates,
  ])

  return {
    availablePics,
    availablePids,
    availablePubnames,
    availableMids,
    availableMedianames,
    availableZids,
    availableZonenames,
    availableProducts,
    loadingStates,
    filterModes,
  }
}
