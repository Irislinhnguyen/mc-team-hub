/**
 * Skeleton utility functions for dynamic table loading states
 */

import type { ColumnConfig } from '../types/performanceTracker'

/**
 * Calculate smart width for skeleton cells based on column configuration
 *
 * @param column - Column configuration
 * @returns CSS width value (%, px, or auto)
 */
export function getSkeletonColumnWidth(column: ColumnConfig): string {
  // If width is explicitly defined, use it
  if (column.width) {
    return column.width
  }

  // Smart fallback based on column key patterns
  const key = column.key.toLowerCase()

  // Date columns
  if (key.includes('date') || key.includes('time')) {
    return '18%'
  }

  // ID columns (short)
  if (key === 'pid' || key === 'mid' || key === 'zid' || key.endsWith('id')) {
    return '10%'
  }

  // Name columns (wide)
  if (key.includes('name') || key === 'product' || key === 'team') {
    return '30%'
  }

  // Metric columns (medium)
  if (
    key.includes('rev') ||
    key.includes('profit') ||
    key.includes('req') ||
    key.includes('paid') ||
    key.includes('cpm') ||
    key.includes('rate')
  ) {
    return '12%'
  }

  // Default fallback
  return '15%'
}

/**
 * Get skeleton height variant based on column type
 * Useful for creating varied skeleton heights for more realistic loading
 *
 * @param column - Column configuration
 * @returns Tailwind height class
 */
export function getSkeletonHeightClass(column: ColumnConfig): string {
  const key = column.key.toLowerCase()

  // Taller for name columns (might wrap)
  if (key.includes('name')) {
    return 'h-4'
  }

  // Standard for most columns
  return 'h-3'
}

/**
 * Generate random width variation for skeleton cells
 * Creates more natural-looking skeleton loading
 *
 * @param baseWidthPercent - Base width percentage (0-100)
 * @param variation - Variation range in percentage points (default: 10)
 * @returns Width percentage string
 */
export function getRandomSkeletonWidth(baseWidthPercent: number = 80, variation: number = 10): string {
  const min = baseWidthPercent - variation
  const max = baseWidthPercent + variation
  const randomWidth = Math.floor(Math.random() * (max - min + 1)) + min
  return `${Math.max(50, Math.min(100, randomWidth))}%`
}
