/**
 * Color Utility Functions
 * Shared color mapping functions for performance tiers, grades, and levels
 */

import { colors } from '../colors'

/**
 * Get color for health level
 * @param level - Health level (Excellent, Good, Fair, Poor)
 */
export function getHealthColor(level: string): string {
  switch (level) {
    case 'Excellent':
      return colors.status.success
    case 'Good':
      return colors.status.info
    case 'Fair':
      return colors.status.warning
    case 'Poor':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color for letter grade (A, B, C, D, F)
 * @param grade - Letter grade (A+, A, A-, B+, etc.)
 */
export function getGradeColor(grade?: string): string {
  if (!grade) return colors.text.secondary

  const letter = grade.charAt(0)
  switch (letter) {
    case 'A':
      return colors.status.success
    case 'B':
      return colors.status.info
    case 'C':
      return colors.status.warning
    case 'D':
    case 'F':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color for risk level (Low, Medium, High)
 * @param risk - Risk level
 */
export function getRiskColor(risk?: string): string {
  switch (risk) {
    case 'Low':
      return colors.status.success
    case 'Medium':
      return colors.status.warning
    case 'High':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color for growth momentum level
 * @param level - Momentum level (Strong, Moderate, Stable, Declining, Critical)
 */
export function getMomentumColor(level: string): string {
  switch (level) {
    case 'Strong':
      return colors.status.success
    case 'Moderate':
      return colors.status.info
    case 'Stable':
      return colors.status.warning
    case 'Declining':
      return colors.status.danger
    case 'Critical':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color for market penetration level
 * @param level - Penetration level (High, Medium, Low)
 */
export function getPenetrationColor(level: string): string {
  switch (level) {
    case 'High':
      return colors.status.success
    case 'Medium':
      return colors.status.warning
    case 'Low':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color for saturation level
 * @param level - Saturation level (Low, Medium, High)
 */
export function getSaturationColor(level: string): string {
  switch (level) {
    case 'Low':
      return colors.status.success
    case 'Medium':
      return colors.status.warning
    case 'High':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color for upsell potential
 * @param level - Upsell level (High, Medium, Low)
 */
export function getUpsellColor(level?: string): string {
  switch (level) {
    case 'High':
      return colors.status.success
    case 'Medium':
      return colors.status.warning
    case 'Low':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color for churn risk
 * @param level - Churn risk level (Low, Medium, High)
 */
export function getChurnColor(level?: string): string {
  switch (level) {
    case 'Low':
      return colors.status.success
    case 'Medium':
      return colors.status.warning
    case 'High':
      return colors.status.danger
    default:
      return colors.text.secondary
  }
}

/**
 * Get color based on change percentage (positive = green, negative = red)
 * @param changePercent - Percentage change
 */
export function getChangeColor(changePercent: number): string {
  if (changePercent > 0) return colors.status.success
  if (changePercent < 0) return colors.status.danger
  return colors.text.secondary
}

/**
 * Get color based on value threshold with high/medium/low logic
 * @param value - Numeric value
 * @param highThreshold - Threshold for "high" (green)
 * @param lowThreshold - Threshold for "low" (red)
 */
export function getThresholdColor(
  value: number,
  highThreshold: number,
  lowThreshold: number
): string {
  if (value >= highThreshold) return colors.status.success
  if (value <= lowThreshold) return colors.status.danger
  return colors.status.warning
}
