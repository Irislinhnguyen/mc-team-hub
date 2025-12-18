import { useMemo } from 'react'

/**
 * Relationship map structure returned by metadata API
 */
export interface RelationshipMap {
  // Forward ID mappings
  picToPid: Record<string, string[]>
  pidToMid: Record<string, string[]>
  midToZid: Record<string, string[]>
  zidToProduct: Record<string, string[]>

  // Name field mappings
  pidToPubname: Record<string, string[]>
  midToMedianame: Record<string, string[]>
  zidToZonename: Record<string, string[]>

  // Reverse name → ID mappings
  pubnameToPid: Record<string, string[]>
  medianameToMid: Record<string, string[]>
  zonenameToZid: Record<string, string[]>
  productToZid: Record<string, string[]>

  // Reverse ID mappings
  pidToPic: Record<string, string[]>
  midToPid: Record<string, string[]>
  zidToMid: Record<string, string[]>

  // Team mappings
  teamToPic: Record<string, string[]>
}

export interface MetadataWithRelationships {
  relationships?: RelationshipMap
  [key: string]: any
}

/**
 * useRelationshipMap - Client-side relationship mapping hook (Looker Studio-style)
 *
 * Provides efficient helper methods for cascading filter logic using
 * pre-loaded relationship maps from the metadata API.
 *
 * @param metadata - Metadata object containing relationship maps
 * @returns Helper methods for traversing relationships
 */
export function useRelationshipMap(metadata: MetadataWithRelationships | null) {
  return useMemo(() => {
    if (!metadata?.relationships) {
      return null
    }

    const rel = metadata.relationships

    return {
      // Direct access to relationship maps
      ...rel,

      // Helper: Get PIDs from PICs (forward)
      getPidsFromPics: (pics: string[]): string[] => {
        const pids = new Set<string>()
        pics.forEach((pic) => {
          const picPids = rel.picToPid[pic] || []
          picPids.forEach((pid) => pids.add(pid))
        })
        return Array.from(pids)
      },

      // Helper: Get MIDs from PIDs (forward)
      getMidsFromPids: (pids: string[]): string[] => {
        const mids = new Set<string>()
        pids.forEach((pid) => {
          const pidMids = rel.pidToMid[pid] || []
          pidMids.forEach((mid) => mids.add(mid))
        })
        return Array.from(mids)
      },

      // Helper: Get ZIDs from MIDs (forward)
      getZidsFromMids: (mids: string[]): string[] => {
        const zids = new Set<string>()
        mids.forEach((mid) => {
          const midZids = rel.midToZid[mid] || []
          midZids.forEach((zid) => zids.add(zid))
        })
        return Array.from(zids)
      },

      // Helper: Get Products from ZIDs (forward)
      getProductsFromZids: (zids: string[]): string[] => {
        const products = new Set<string>()
        zids.forEach((zid) => {
          const zidProducts = rel.zidToProduct[zid] || []
          zidProducts.forEach((product) => products.add(product))
        })
        return Array.from(products)
      },

      // Helper: Get PICs from PIDs (reverse)
      getPicsFromPids: (pids: string[]): string[] => {
        const pics = new Set<string>()
        pids.forEach((pid) => {
          const pidPics = rel.pidToPic[pid] || []
          pidPics.forEach((pic) => pics.add(pic))
        })
        return Array.from(pics)
      },

      // Helper: Get PIDs from MIDs (reverse)
      getPidsFromMids: (mids: string[]): string[] => {
        const pids = new Set<string>()
        mids.forEach((mid) => {
          const midPids = rel.midToPid[mid] || []
          midPids.forEach((pid) => pids.add(pid))
        })
        return Array.from(pids)
      },

      // Helper: Get MIDs from ZIDs (reverse)
      getMidsFromZids: (zids: string[]): string[] => {
        const mids = new Set<string>()
        zids.forEach((zid) => {
          const zidMids = rel.zidToMid[zid] || []
          zidMids.forEach((mid) => mids.add(mid))
        })
        return Array.from(mids)
      },

      // Helper: Get ZIDs from Products (reverse)
      getZidsFromProducts: (products: string[]): string[] => {
        const zids = new Set<string>()
        products.forEach((product) => {
          const productZids = rel.productToZid[product] || []
          productZids.forEach((zid) => zids.add(zid))
        })
        return Array.from(zids)
      },

      // Helper: Get PICs from Team
      getPicsFromTeams: (teams: string[]): string[] => {
        const pics = new Set<string>()
        teams.forEach((team) => {
          const teamPics = rel.teamToPic[team] || []
          teamPics.forEach((pic) => pics.add(pic))
        })
        return Array.from(pics)
      },

      // Helper: Get Pubnames from PIDs (name field)
      getPubnamesFromPids: (pids: string[]): string[] => {
        const pubnames = new Set<string>()
        pids.forEach((pid) => {
          const pidPubnames = rel.pidToPubname[pid] || []
          pidPubnames.forEach((pubname) => pubnames.add(pubname))
        })
        return Array.from(pubnames)
      },

      // Helper: Get Medianames from MIDs (name field)
      getMedianamesFromMids: (mids: string[]): string[] => {
        const medianames = new Set<string>()
        mids.forEach((mid) => {
          const midMedianames = rel.midToMedianame[mid] || []
          midMedianames.forEach((medianame) => medianames.add(medianame))
        })
        return Array.from(medianames)
      },

      // Helper: Get Zonenames from ZIDs (name field)
      getZonenamesFromZids: (zids: string[]): string[] => {
        const zonenames = new Set<string>()
        zids.forEach((zid) => {
          const zidZonenames = rel.zidToZonename[zid] || []
          zidZonenames.forEach((zonename) => zonenames.add(zonename))
        })
        return Array.from(zonenames)
      },

      // Helper: Get PIDs from Pubnames (reverse name field)
      getPidsFromPubnames: (pubnames: string[]): string[] => {
        const pids = new Set<string>()
        pubnames.forEach((pubname) => {
          const pubnamePids = rel.pubnameToPid[pubname] || []
          pubnamePids.forEach((pid) => pids.add(pid))
        })
        return Array.from(pids)
      },

      // Helper: Get MIDs from Medianames (reverse name field)
      getMidsFromMedianames: (medianames: string[]): string[] => {
        const mids = new Set<string>()
        medianames.forEach((medianame) => {
          const medianameMids = rel.medianameToMid[medianame] || []
          medianameMids.forEach((mid) => mids.add(mid))
        })
        return Array.from(mids)
      },

      // Helper: Get ZIDs from Zonenames (reverse name field)
      getZidsFromZonenames: (zonenames: string[]): string[] => {
        const zids = new Set<string>()
        zonenames.forEach((zonename) => {
          const zonameZids = rel.zonenameToZid[zonename] || []
          zonameZids.forEach((zid) => zids.add(zid))
        })
        return Array.from(zids)
      },

      // Helper: Transitive - Get MIDs from PICs (skip PID level)
      getMidsFromPics: (pics: string[]): string[] => {
        const pids = new Set<string>()
        pics.forEach((pic) => {
          const picPids = rel.picToPid[pic] || []
          picPids.forEach((pid) => pids.add(pid))
        })

        const mids = new Set<string>()
        Array.from(pids).forEach((pid) => {
          const pidMids = rel.pidToMid[pid] || []
          pidMids.forEach((mid) => mids.add(mid))
        })
        return Array.from(mids)
      },

      // Helper: Transitive - Get ZIDs from PICs (skip PID, MID levels)
      getZidsFromPics: (pics: string[]): string[] => {
        const pids = new Set<string>()
        pics.forEach((pic) => {
          const picPids = rel.picToPid[pic] || []
          picPids.forEach((pid) => pids.add(pid))
        })

        const mids = new Set<string>()
        Array.from(pids).forEach((pid) => {
          const pidMids = rel.pidToMid[pid] || []
          pidMids.forEach((mid) => mids.add(mid))
        })

        const zids = new Set<string>()
        Array.from(mids).forEach((mid) => {
          const midZids = rel.midToZid[mid] || []
          midZids.forEach((zid) => zids.add(zid))
        })
        return Array.from(zids)
      },

      // Helper: Transitive - Get Products from PICs (full chain)
      getProductsFromPics: (pics: string[]): string[] => {
        const pids = new Set<string>()
        pics.forEach((pic) => {
          const picPids = rel.picToPid[pic] || []
          picPids.forEach((pid) => pids.add(pid))
        })

        const mids = new Set<string>()
        Array.from(pids).forEach((pid) => {
          const pidMids = rel.pidToMid[pid] || []
          pidMids.forEach((mid) => mids.add(mid))
        })

        const zids = new Set<string>()
        Array.from(mids).forEach((mid) => {
          const midZids = rel.midToZid[mid] || []
          midZids.forEach((zid) => zids.add(zid))
        })

        const products = new Set<string>()
        Array.from(zids).forEach((zid) => {
          const zidProducts = rel.zidToProduct[zid] || []
          zidProducts.forEach((product) => products.add(product))
        })
        return Array.from(products)
      },

      // Helper: Transitive - Get PICs from Products (full chain reverse)
      getPicsFromProducts: (products: string[]): string[] => {
        const zids = new Set<string>()
        products.forEach((product) => {
          const productZids = rel.productToZid[product] || []
          productZids.forEach((zid) => zids.add(zid))
        })

        const mids = new Set<string>()
        Array.from(zids).forEach((zid) => {
          const zidMids = rel.zidToMid[zid] || []
          zidMids.forEach((mid) => mids.add(mid))
        })

        const pids = new Set<string>()
        Array.from(mids).forEach((mid) => {
          const midPids = rel.midToPid[mid] || []
          midPids.forEach((pid) => pids.add(pid))
        })

        const pics = new Set<string>()
        Array.from(pids).forEach((pid) => {
          const pidPics = rel.pidToPic[pid] || []
          pidPics.forEach((pic) => pics.add(pic))
        })
        return Array.from(pics)
      },
    }
  }, [metadata])
}

/**
 * Utility: Intersect two sets
 * Returns items that exist in BOTH sets
 */
export function intersect<T>(set1: Set<T>, array: T[]): Set<T> {
  return new Set(array.filter((item) => set1.has(item)))
}

/**
 * Utility: Union of arrays into a set
 * Returns unique items from all arrays combined
 */
export function union<T>(...arrays: T[][]): Set<T> {
  const result = new Set<T>()
  arrays.forEach((arr) => arr.forEach((item) => result.add(item)))
  return result
}
