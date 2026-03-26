/**
 * Design Tokens for Analytics Dashboard & MC Bible
 * Centralized typography and styling constants
 *
 * CORRECT USAGE:
 * import { typography, colors, spacing, composedStyles, bible, bibleStyles } from '@/lib/design-tokens'
 *
 * Analytics Dashboard Components:
 * - Font sizes: use inline style={{ fontSize: typography.sizes.xxx }}
 * - Colors: use className={colors.text.primary}  (NOT style!)
 * - Spacing: use className={spacing.cardPadding}
 * - Composed styles: use className={composedStyles.pageTitle}
 *
 * Bible Components:
 * - Typography: className={bible.typography.pageTitle}
 * - Icons: className={bible.iconSizes.sm}
 * - Spacing: className={bible.spacing.cardPadding}
 * - Composed: className={bibleStyles.articleTitle}
 * - Status: className={bibleStyles.correctAnswer}
 *
 * COMMON MISTAKES TO AVOID:
 * - className="text-lg font-semibold" → Use className={bible.typography.quizTitle}
 * - className="h-4 w-4" → Use className={bible.iconSizes.sm}
 * - className="border-green-500" → Use className={bible.status.correct.border}
 * - style={{ fontSize: '18px' }} → Use style={{ fontSize: typography.sizes.pageTitle }}
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

// =====================================================
// BIBLE-SPECIFIC TOKENS
// =====================================================

/**
 * Bible Component Tokens
 * Design tokens specific to MC Bible (Course Edition) components
 * Complementary to Analytics Dashboard tokens
 */

export const bible = {
  // Typography for Bible components
  typography: {
    // Page-level headings
    mainTitle: 'font-bold text-slate-900', // Bible main page
    pathTitle: 'font-bold text-slate-900',  // Individual path page
    sectionTitle: 'font-semibold text-slate-900', // Card/section headers

    // Article content
    articleTitle: 'text-2xl font-bold',      // Article heading in viewer
    articleBody: 'text-base',                 // Article content body
    articleMeta: 'text-sm text-muted-foreground', // Article metadata

    // Component headings
    quizTitle: 'text-lg font-semibold',       // Quiz section header
    tocTitle: 'font-semibold text-sm',        // Table of contents header
    searchLabel: 'text-sm font-medium',       // Search/helper text

    // UI elements
    buttonText: 'text-sm',                   // Button text
    badgeText: 'text-xs',                     // Badge labels
    helperText: 'text-xs text-muted-foreground', // Hints and help text
  },

  // Icon sizes (semantic)
  iconSizes: {
    xs: 'h-3 w-3',   // 12px - Inline icons (chevrons)
    sm: 'h-4 w-4',   // 16px - Standard UI icons
    md: 'h-5 w-5',   // 20px - Emphasized icons
    lg: 'h-8 w-8',   // 32px - Feature icons (file types)
    xl: 'h-12 w-12',  // 48px - Hero icons (loading, empty states)
    xxl: 'h-16 w-16', // 64px - Extra large (preview errors)
  },

  // Spacing for Bible components
  spacing: {
    // Component containers
    pagePadding: 'p-8',                    // Main page padding
    cardPadding: 'p-4',                   // Standard card content
    cardPaddingCompact: 'p-3',            // Compact card content
    cardPaddingLoose: 'p-6',              // Loose card content

    // Element spacing
    listGap: 'gap-3',                      // Article list items
    buttonGap: 'gap-2',                    // Button groups
    formGap: 'gap-4',                      // Form elements

    // Section spacing
    sectionGap: 'space-y-4',               // Section vertical spacing
    sectionGapLoose: 'space-y-6',           // Loose section spacing
    itemGap: 'space-y-2',                  // Item vertical spacing
  },

  // Status colors for interactive elements
  status: {
    correct: {
      border: 'border-green-500',
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-600 dark:text-green-400',
    },
    incorrect: {
      border: 'border-red-500',
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-600 dark:text-red-400',
    },
    disabled: {
      bg: 'bg-muted/50',
      text: 'text-muted-foreground',
    },
  },

  // Interactive states
  states: {
    hover: 'hover:bg-accent/50',
    active: 'bg-primary text-primary-foreground',
    focus: 'focus:ring-2 focus:ring-ring',
  },

  // Heights and sizes
  sizes: {
    // Scroll areas
    scrollArea: 'h-[calc(100vh-20rem)]',      // Article list scroll
    scrollAreaShort: 'h-[calc(100vh-4rem)]',  // Path sidebar scroll
    tocScroll: 'max-h-[400px]',                // TOC max height

    // Dialogs and modals
    dialogMax: 'max-h-[90vh]',
    dialogContent: 'min-h-[400px]',

    // Media
    videoAspect: 'aspect-video',              // 16:9 video
    slideAspect: '[padding-bottom:56.25%]',   // 16:9 slides

    // Loading states
    loadingMinHeight: 'min-h-[50vh]',
  },

  // Opacity for backgrounds
  opacity: {
    subtle: 'bg-muted/20',    // Very subtle backgrounds
    medium: 'bg-muted/30',    // Medium backgrounds
    strong: 'bg-muted/50',    // Strong backgrounds
  },

  // Border radius
  radius: {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  },
} as const

// Bible-specific composed styles
export const bibleStyles = {
  // Page headers
  mainPageHeader: `${bible.typography.mainTitle}`,
  pathPageHeader: `${bible.typography.pathTitle}`,

  // Card headers
  cardHeader: `${bible.typography.sectionTitle}`,
  quizHeader: `${bible.typography.quizTitle}`,

  // Article elements
  articleTitle: `${bible.typography.articleTitle}`,
  articleMeta: `${bible.typography.articleMeta}`,

  // Status combinations
  correctAnswer: `${bible.status.correct.bg} ${bible.status.correct.border} ${bible.status.correct.text}`,
  incorrectAnswer: `${bible.status.incorrect.bg} ${bible.status.incorrect.border} ${bible.status.incorrect.text}`,

  // Interactive elements
  button: `${bible.typography.buttonText}`,
  badge: `${bible.typography.badgeText}`,
  helper: `${bible.typography.helperText}`,
} as const
