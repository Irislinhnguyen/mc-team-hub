'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useBreakpoint, type Breakpoint } from '@/hooks/use-mobile'
import { chartSizes, typography, composedStyles } from '@/lib/design-tokens'

/**
 * Responsive chart configuration provided via context
 * Available to all child components via useResponsiveChart()
 */
export interface ResponsiveChartConfig {
  chartHeight: number
  chartMargins: typeof chartSizes.margins.default
  fontSize: {
    title: string
    axis: string
    tooltip: string
    legend: string
  }
  breakpoint: Breakpoint
  isMobile: boolean
}

/**
 * Context for passing responsive configuration to chart components
 */
const ResponsiveChartContext = createContext<ResponsiveChartConfig | null>(null)

/**
 * Hook to access responsive chart configuration
 * Must be used within a BaseResponsiveChart component
 *
 * @throws Error if used outside BaseResponsiveChart
 * @returns ResponsiveChartConfig
 */
export function useResponsiveChart(): ResponsiveChartConfig {
  const context = useContext(ResponsiveChartContext)
  if (!context) {
    throw new Error('useResponsiveChart must be used within BaseResponsiveChart')
  }
  return context
}

export interface BaseResponsiveChartProps {
  /** Chart title displayed in header */
  title: string
  /** Hide the title header (for embedded charts) */
  hideTitle?: boolean
  /** Chart content (ResponsiveContainer with Recharts components) */
  children: ReactNode
  /** Override minimum height (useful for dynamic charts) */
  minHeight?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * BaseResponsiveChart - Foundation component for all charts
 *
 * Provides:
 * - Responsive height based on breakpoint (280px mobile, 360px desktop)
 * - Responsive margins (tighter on mobile)
 * - Responsive font sizes (10px mobile, 12px desktop)
 * - Chart configuration via context (useResponsiveChart)
 * - Consistent Card wrapper with title
 *
 * Usage:
 * ```tsx
 * <BaseResponsiveChart title="Revenue Trend">
 *   <TimeSeriesChartContent data={data} />
 * </BaseResponsiveChart>
 * ```
 *
 * Inside child component:
 * ```tsx
 * const { chartHeight, fontSize, breakpoint } = useResponsiveChart()
 * ```
 */
export function BaseResponsiveChart({
  title,
  hideTitle = false,
  children,
  minHeight,
  className = ''
}: BaseResponsiveChartProps) {
  const breakpoint = useBreakpoint()

  // Calculate responsive configuration based on breakpoint
  const config = useMemo((): ResponsiveChartConfig => {
    const isMobile = breakpoint === 'xs' || breakpoint === 'sm'
    const isTablet = breakpoint === 'md'

    // Determine chart height
    let chartHeight: number
    if (minHeight) {
      chartHeight = minHeight
    } else if (isMobile) {
      chartHeight = chartSizes.heights.mobile // 280px
    } else if (isTablet) {
      chartHeight = chartSizes.heights.tablet // 320px
    } else {
      chartHeight = chartSizes.heights.desktop // 360px
    }

    // Determine chart margins
    const chartMargins = isMobile
      ? chartSizes.margins.mobile
      : chartSizes.margins.default

    // Determine font sizes
    const fontSize = {
      title: isMobile ? '13px' : typography.sizes.sectionTitle,
      axis: isMobile ? '10px' : '12px',
      tooltip: isMobile ? '11px' : '12px',
      legend: isMobile ? '11px' : '12px',
    }

    return {
      chartHeight,
      chartMargins,
      fontSize,
      breakpoint,
      isMobile
    }
  }, [breakpoint, minHeight])

  return (
    <Card className={className}>
      {!hideTitle && (
        <CardHeader className="pb-2 md:pb-3">
          <h3
            className={composedStyles.sectionTitle}
            style={{ fontSize: config.fontSize.title }}
          >
            {title}
          </h3>
        </CardHeader>
      )}
      <CardContent className="p-2 md:p-4">
        <ResponsiveChartContext.Provider value={config}>
          {children}
        </ResponsiveChartContext.Provider>
      </CardContent>
    </Card>
  )
}

/**
 * Utility function to calculate dynamic chart height based on data length
 *
 * Useful for bar charts where each bar needs minimum height
 *
 * @param dataLength - Number of data points
 * @param breakpoint - Current breakpoint
 * @param itemHeight - Height per item (default: 32px)
 * @returns Calculated height (capped at 800px)
 */
export function getDynamicChartHeight(
  dataLength: number,
  breakpoint: Breakpoint,
  itemHeight: number = 32
): number {
  const baseHeight = breakpoint === 'xs' || breakpoint === 'sm'
    ? chartSizes.heights.mobile
    : chartSizes.heights.desktop

  const calculatedHeight = dataLength * itemHeight + 60 // +60 for axes/padding

  // Return max of baseHeight and calculatedHeight, capped at 800px
  return Math.max(baseHeight, Math.min(calculatedHeight, 800))
}
