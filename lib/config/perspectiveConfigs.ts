/**
 * Perspective Configurations for Deep Dive Analysis
 *
 * Defines the structure and behavior of each analysis perspective
 * Used by unified deep-dive API to generate appropriate queries
 */

export type PerspectiveType = 'team' | 'pic' | 'pid' | 'mid' | 'product' | 'zone'

export interface PerspectiveConfig {
  /** Unique identifier for this perspective */
  id: PerspectiveType

  /** Display name for UI */
  displayName: string

  /** SQL GROUP BY clause (e.g., 'pid, mid' for PID perspective) */
  groupBy: string

  /** Primary ID field for this perspective */
  idField: string

  /** SQL expression for the name/label field */
  nameField: string

  /** Additional fields to select (beyond standard metrics) */
  additionalFields?: string[]

  /** Child perspective for drill-down (if any) */
  childPerspective?: PerspectiveType

  /** GROUP BY clause for child entities in drill-down */
  childGroupBy?: string

  /** Whether to include year-over-year historical comparison */
  includeHistorical: boolean

  /** Whether this is a leaf-level perspective (no drill-down) */
  isLeaf: boolean

  /** Table name to query from */
  tableName: string
}

/**
 * Configuration for all supported perspectives
 */
export const PERSPECTIVE_CONFIGS: Record<PerspectiveType, PerspectiveConfig> = {
  team: {
    id: 'team',
    displayName: 'Team Analysis',
    groupBy: 'team',
    idField: 'team',
    nameField: 'team as name',
    additionalFields: ['COUNT(DISTINCT pic) as pic_count'],
    childPerspective: 'pic',
    childGroupBy: 'pic',
    includeHistorical: false,
    isLeaf: false,
    tableName: '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'
  },

  pic: {
    id: 'pic',
    displayName: 'PIC (Person in Charge) Analysis',
    groupBy: 'pic',
    idField: 'pic',
    nameField: 'pic as name',
    additionalFields: ['COUNT(DISTINCT pid) as publisher_count'],
    childPerspective: 'pid',
    childGroupBy: 'pid',
    includeHistorical: true,
    isLeaf: false,
    tableName: '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'
  },

  pid: {
    id: 'pid',
    displayName: 'Publisher Analysis',
    groupBy: 'pid',
    idField: 'pid',
    nameField: 'MAX(pubname) as name',
    additionalFields: ['COUNT(DISTINCT mid) as media_count'],
    childPerspective: 'mid',
    childGroupBy: 'mid',
    includeHistorical: true,
    isLeaf: false,
    tableName: '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'
  },

  mid: {
    id: 'mid',
    displayName: 'Media Property Analysis',
    groupBy: 'mid',
    idField: 'mid',
    nameField: 'MAX(medianame) as name',
    additionalFields: ['COUNT(DISTINCT zid) as zone_count'],
    childPerspective: 'zone',
    childGroupBy: 'zid',
    includeHistorical: true,
    isLeaf: false,
    tableName: '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'
  },

  product: {
    id: 'product',
    displayName: 'Product Analysis',
    groupBy: 'product',
    idField: 'product',
    nameField: 'product as name',
    additionalFields: [
      'COUNT(DISTINCT pid) as publisher_count',
      'COUNT(DISTINCT mid) as media_count',
      'COUNT(DISTINCT zid) as zone_count'
    ],
    childPerspective: 'zone',
    childGroupBy: 'zid',
    includeHistorical: true,
    isLeaf: false,
    tableName: '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'
  },

  zone: {
    id: 'zone',
    displayName: 'Zone Analysis',
    groupBy: 'zid',
    idField: 'zid',
    nameField: 'MAX(zonename) as name',
    additionalFields: ['MAX(product) as product'],
    childPerspective: undefined,
    childGroupBy: undefined,
    includeHistorical: false,
    isLeaf: true,
    tableName: '`gcpp-check.GI_publisher.agg_monthly_with_pic_table`'
  }
}

/**
 * Get configuration for a specific perspective
 */
export function getPerspectiveConfig(perspective: PerspectiveType): PerspectiveConfig {
  const config = PERSPECTIVE_CONFIGS[perspective]
  if (!config) {
    throw new Error(`Unknown perspective: ${perspective}`)
  }
  return config
}

/**
 * Get drill-down hierarchy path for a perspective
 * Returns array from root to current level
 */
export function getDrillDownPath(perspective: PerspectiveType): PerspectiveType[] {
  const paths: Record<PerspectiveType, PerspectiveType[]> = {
    team: ['team'],
    pic: ['team', 'pic'],
    pid: ['team', 'pic', 'pid'],
    mid: ['team', 'pic', 'pid', 'mid'],
    product: ['product'],
    zone: ['team', 'pic', 'pid', 'mid', 'zone'] // or ['product', 'zone']
  }

  return paths[perspective] || [perspective]
}

/**
 * Validate perspective and parent combinations
 */
export function validateDrillDown(
  perspective: PerspectiveType,
  parentPerspective?: PerspectiveType
): boolean {
  if (!parentPerspective) return true

  const config = getPerspectiveConfig(parentPerspective)
  return config.childPerspective === perspective
}
