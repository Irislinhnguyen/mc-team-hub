/**
 * Zone Name Formatter Utility
 * Generates zone names for Team Web workflow
 */

import type { BannerSizeConfig } from '@/lib/types/tools'

/**
 * Format zone name for Web team
 * @param product Product type (e.g., "Banner", "Interstitial", "Reward")
 * @param sizeConfig Banner size configuration (only for Banner product)
 * @param index Zone sequence number (1-based)
 * @returns Formatted zone name (e.g., "banner_300x250_1", "interstitial_2")
 */
export function formatWebZoneName(
  product: string,
  sizeConfig?: BannerSizeConfig,
  index: number = 1
): string {
  // Normalize product name to lowercase
  const productLower = product.toLowerCase().replace(/\s+/g, '_')

  // Build size part for Banner products
  let sizePart = ''
  if (product.toLowerCase().includes('banner') && sizeConfig) {
    if (sizeConfig.preset) {
      // Use preset size (e.g., "300x250")
      sizePart = `_${sizeConfig.preset}`
    } else if (sizeConfig.custom) {
      // Use custom size (e.g., "468x60")
      sizePart = `_${sizeConfig.custom.width}x${sizeConfig.custom.height}`
    }
  }

  // Build suffix (_1, _2, _3, etc.)
  const suffix = `_${index}`

  // Combine parts
  return `${productLower}${sizePart}${suffix}`
}

/**
 * Validate banner size configuration
 * @param width Width in pixels
 * @param height Height in pixels
 * @returns Validation result
 */
export function validateBannerSize(width: number, height: number): {
  valid: boolean
  error?: string
} {
  if (width <= 0 || height <= 0) {
    return {
      valid: false,
      error: 'Width and height must be greater than 0',
    }
  }

  if (width > 10000 || height > 10000) {
    return {
      valid: false,
      error: 'Width and height must be less than 10000 pixels',
    }
  }

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return {
      valid: false,
      error: 'Width and height must be integers',
    }
  }

  return { valid: true }
}

/**
 * Parse size string to BannerSizeConfig
 * @param sizeString Size string (e.g., "300x250")
 * @returns BannerSizeConfig object
 */
export function parseBannerSize(sizeString: string): BannerSizeConfig | undefined {
  const match = sizeString.match(/^(\d+)x(\d+)$/)
  if (!match) return undefined

  const width = parseInt(match[1], 10)
  const height = parseInt(match[2], 10)

  const validation = validateBannerSize(width, height)
  if (!validation.valid) return undefined

  return {
    custom: { width, height },
  }
}

/**
 * Format banner size for display
 * @param sizeConfig Banner size configuration
 * @returns Formatted size string (e.g., "300×250")
 */
export function formatBannerSize(sizeConfig: BannerSizeConfig): string {
  if (sizeConfig.preset) {
    return sizeConfig.preset.replace('x', '×')
  }

  if (sizeConfig.custom) {
    return `${sizeConfig.custom.width}×${sizeConfig.custom.height}`
  }

  return 'N/A'
}
