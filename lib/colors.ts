/**
 * Minimal Color System for Analytics Dashboard
 * Based on Google Analytics 4 design language
 * Philosophy: White backgrounds, gray text hierarchy, blue only for interactive elements
 */

export const colors = {
  // Legacy colors (keep for backward compatibility)
  main: '#1565C0',
  neutralLight: '#F5F5F5',
  neutralDark: '#757575',
  accent: '#BBDEFB',
  contrast: '#D9D9D9',

  // NEW: Surface colors (backgrounds)
  surface: {
    page: '#FAFAFA',        // Page/canvas background
    card: '#FFFFFF',        // Card backgrounds
    elevated: '#FFFFFF',    // Modal/popup backgrounds
    muted: '#F5F5F5',       // Disabled/inactive backgrounds
  },

  // NEW: Text hierarchy
  text: {
    primary: '#212121',     // Main headings and important text
    secondary: '#757575',   // Body text and labels
    tertiary: '#9E9E9E',    // Captions and disabled text
    inverse: '#FFFFFF',     // Text on dark backgrounds
  },

  // NEW: Border colors
  border: {
    default: '#E0E0E0',     // Standard borders
    strong: '#BDBDBD',      // Emphasized borders
    focus: '#1565C0',       // Active/focused borders
    muted: '#F5F5F5',       // Subtle dividers
  },

  // NEW: Data visualization (restrained palette)
  data: {
    primary: '#1565C0',     // Main data color (your existing blue)
    secondary: '#78909C',   // Comparison/secondary data (blue-gray)
    tertiary: '#B0BEC5',    // Background/context data (light blue-gray)
    muted: '#CFD8DC',       // Inactive/disabled data

    // Product colors (limited to 5 max)
    product1: '#1565C0',    // Primary blue
    product2: '#42A5F5',    // Light blue
    product3: '#90CAF9',    // Lighter blue
    product4: '#FF6F00',    // Orange accent (for important products)
    productOther: '#9E9E9E', // Gray (for "Other" category)
  },

  // NEW: Status colors (use sparingly - only for actual status)
  status: {
    success: '#2E7D32',     // Dark green - for growth indicators
    warning: '#F57C00',     // Dark orange - for warnings
    danger: '#C62828',      // Dark red - for critical alerts
    info: '#0277BD',        // Info blue - for informational messages

    // Backgrounds for status (very subtle)
    successBg: '#E8F5E9',
    warningBg: '#FFF3E0',
    dangerBg: '#FFEBEE',
    infoBg: '#E3F2FD',
  },

  // NEW: Interactive states
  interactive: {
    primary: '#1565C0',     // Primary actions (buttons, links)
    primaryHover: '#0D47A1', // Primary hover state
    secondary: '#78909C',   // Secondary actions
    secondaryHover: '#546E7A', // Secondary hover state
    disabled: '#E0E0E0',    // Disabled state
  },
} as const

export type ColorKey = keyof typeof colors

// CSS variable names for use in Tailwind or inline styles
export const cssVars = {
  main: 'var(--color-main)',
  neutralLight: 'var(--color-neutral-light)',
  neutralDark: 'var(--color-neutral-dark)',
  accent: 'var(--color-accent)',
  contrast: 'var(--color-contrast)',
} as const

// Helper function to get color value
export const getColor = (key: ColorKey): any => colors[key]

// Helper to get nested color values
export const getSurfaceColor = (key: keyof typeof colors.surface): string => colors.surface[key]
export const getTextColor = (key: keyof typeof colors.text): string => colors.text[key]
export const getBorderColor = (key: keyof typeof colors.border): string => colors.border[key]
export const getDataColor = (key: keyof typeof colors.data): string => colors.data[key]
export const getStatusColor = (key: keyof typeof colors.status): string => colors.status[key]
export const getInteractiveColor = (key: keyof typeof colors.interactive): string => colors.interactive[key]
