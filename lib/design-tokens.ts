/**
 * Design Tokens for Analytics Dashboard
 * Centralized typography and styling constants
 *
 * CORRECT USAGE:
 * import { typography, colors, spacing, composedStyles } from '@/lib/design-tokens'
 *
 * - Font sizes: use inline style={{ fontSize: typography.sizes.xxx }}
 * - Colors: use className={colors.text.primary}  (NOT style!)
 * - Spacing: use className={spacing.cardPadding}
 * - Composed styles: use className={composedStyles.pageTitle}
 *
 * COMMON MISTAKES TO AVOID:
 * - style={{ color: colors.text.primary }}  // colors are className strings, not style objects
 * - style={{ fontSize: colors.text.primary }}  // WRONG! Use typography.sizes.xxx
 * - Forgot to import 'typography' when using typography.sizes.xxx
 */

export const typography = {
  // Font Sizes - Using inline styles for exact pixel values
  // These will be applied via style prop for guaranteed accuracy
  sizes: {
    pageTitle: '18px',        // Page titles (reduced from 20px)
    sectionTitle: '14px',     // Card titles, Chart titles (reduced from 18px)
    metricValue: '24px',      // Metric card numbers (reduced from 28px)
    filterHeader: '12px',     // Filter labels, Table headers (reduced from 14px)
    dataPoint: '12px',        // Table data, Chart axis labels
  },

  // Font Weights
  weights: {
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },

  // Font Family - Using system font stack (can switch to Arial)
  fontFamily: 'font-sans', // Tailwind default sans = system fonts
  // Alternative: 'font-[Arial,sans-serif]' for explicit Arial
} as const

export const spacing = {
  // Component-level padding
  cardPadding: 'p-4',
  headerPadding: 'p-4',
  filterPadding: 'px-4 py-3',

  // Gaps between elements
  cardGap: 'gap-4 md:gap-6',
  filterGap: 'gap-3',
  smallGap: 'gap-2',

  // Section spacing (vertical)
  sectionGap: 'space-y-6 md:space-y-8',
  headerToFilter: 'mb-4',
  filterToChips: 'mb-3',
  chipsToMetrics: 'mb-6',
  metricsToContent: 'mt-8',
} as const

// Chart and Table sizing standards
// Standardized heights and margins for visual consistency across dashboard
export const chartSizes = {
  // Heights - Use 320px as standard for all charts and tables
  heights: {
    standard: 320,        // Standard height for all charts and tables
    standardPx: '320px',  // For CSS/Tailwind usage
  },

  // Margins for Recharts components
  margins: {
    // Default margins for most charts (line, area, etc.)
    default: { top: 20, right: 30, left: 20, bottom: 20 },

    // Bar chart specific margins (tighter for horizontal bars)
    barChart: { top: 20, right: 40, left: 10, bottom: 5 },
  },

  // Y-Axis widths for bar charts
  yAxisWidth: {
    barChart: 120,  // Reduced from 180 for lighter visual weight
  },

  // Usage guidelines:
  // - Use heights.standard for all chart height props
  // - Use heights.standardPx for CSS maxHeight, Tailwind classes
  // - Apply appropriate margins based on chart type
  // - Bar charts use yAxisWidth.barChart for consistent label sizing
} as const

// Component Heights - Standard heights for layout shift prevention
export const componentHeights = {
  // Table components (DataTable, LazyDataTable, PivotTable)
  table: {
    container: '420px',      // Full table card height
    scrollArea: '320px',     // Table scroll container height
  },

  // Chart components (TimeSeriesChart, BarChart)
  chart: {
    container: '380px',      // Full chart card height (header + 320px chart + padding)
    content: '320px',        // Chart ResponsiveContainer height
  },

  // Metric cards
  metricCard: {
    container: '112px',      // MetricCard typical height
  },

  // Usage guidelines:
  // - Apply minHeight to Card components to prevent collapse
  // - Apply minHeight to scroll containers to maintain space
  // - Skeleton components MUST match these exact dimensions
  // - This prevents layout shift during loading states
} as const

export const colors = {
  text: {
    primary: 'text-slate-900',
    secondary: 'text-slate-600',
    muted: 'text-slate-500',
    inverse: 'text-white',
  },
  background: {
    card: 'bg-white',
    muted: 'bg-slate-50',
    primary: 'bg-blue-600',
  },
} as const

// Composed styles for common use cases
// Note: Font sizes should be applied via inline style={{ fontSize: typography.sizes.xxx }}
export const composedStyles = {
  pageTitle: `${typography.weights.bold} ${colors.text.primary}`,
  sectionTitle: `${typography.weights.semibold} ${colors.text.primary}`,
  metricValue: `${typography.weights.bold} ${colors.text.inverse} tabular-nums`,
  filterHeader: `${typography.weights.medium} ${colors.text.secondary}`,
  tableHeader: `${typography.weights.semibold} ${colors.text.secondary}`,
  tableData: `${typography.weights.regular} ${colors.text.primary} tabular-nums`,
} as const
