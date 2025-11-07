/**
 * Centralized number formatting utilities for charts, tables, and metrics
 */

export type MetricType = 'revenue' | 'profit' | 'ecpm' | 'count' | 'id' | 'auto';

/**
 * Metric types that should be formatted with 2 decimal places and thousand separators
 */
const CURRENCY_METRICS = [
  'revenue', 'profit', 'ecpm', 'cpm', 'rpm', 'cpc', 'cpa',
  'earnings', 'cost', 'spend', 'budget', 'payout'
];

/**
 * Metric types that should be formatted as counts (thousand separators, no decimals)
 */
const COUNT_METRICS = [
  'requests', 'paid', 'impressions', 'clicks', 'views', 'visits',
  'users', 'sessions', 'conversions', 'installs', 'downloads',
  'req', 'imp', 'click'
];

/**
 * ID columns that should be displayed as plain numbers
 */
const ID_COLUMNS = [
  'pid', 'mid', 'zid', 'id', 'publisher_id', 'media_id', 'zone_id',
  'advertiser_id', 'campaign_id', 'placement_id', 'year', 'month'
];

/**
 * Detect metric type based on column key
 */
export function detectMetricType(columnKey?: string): MetricType {
  if (!columnKey) return 'auto';

  const lowerKey = columnKey.toLowerCase();

  // Check if it's an ID column
  if (ID_COLUMNS.some(id => lowerKey.includes(id))) {
    return 'id';
  }

  // Check if it's a currency/financial metric
  if (CURRENCY_METRICS.some(metric => lowerKey.includes(metric))) {
    return 'revenue'; // Use revenue formatting for all currency metrics
  }

  // Check if it's a count metric
  if (COUNT_METRICS.some(metric => lowerKey.includes(metric))) {
    return 'count';
  }

  return 'auto';
}

/**
 * Format a value as currency/revenue (2 decimals + thousand separators)
 * Example: 1234.56 -> "1,234.56"
 */
export function formatRevenue(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format a value as count (thousand separators, no decimals)
 * Example: 1234 -> "1,234"
 */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Format a value as ID (plain number)
 * Example: 12345 -> "12345"
 */
export function formatId(value: number): string {
  return Math.round(value).toString();
}

/**
 * Auto-detect and format based on value characteristics
 */
function formatAuto(value: number): string {
  // If it looks like a monetary value (has meaningful decimals), format as revenue
  if (value % 1 !== 0 && value < 1000000) {
    return formatRevenue(value);
  }

  // Otherwise format as count
  return formatCount(value);
}

/**
 * Main formatting function - formats numbers based on metric type
 *
 * @param value - The numeric value to format
 * @param metricType - The type of metric ('revenue', 'count', 'id', or 'auto')
 * @param columnKey - Optional column key for auto-detection
 * @returns Formatted string
 */
export function formatMetricValue(
  value: any,
  metricType: MetricType = 'auto',
  columnKey?: string
): string {
  // Handle non-numeric values
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Convert to number if needed
  const numValue = typeof value === 'number' ? value : parseFloat(value);

  // If not a valid number, return as-is
  if (isNaN(numValue)) {
    return String(value);
  }

  // Auto-detect metric type if needed
  let finalMetricType = metricType;
  if (metricType === 'auto' && columnKey) {
    finalMetricType = detectMetricType(columnKey);
  }

  // Apply appropriate formatting
  switch (finalMetricType) {
    case 'revenue':
    case 'profit':
    case 'ecpm':
      return formatRevenue(numValue);

    case 'count':
      return formatCount(numValue);

    case 'id':
      return formatId(numValue);

    case 'auto':
    default:
      return formatAuto(numValue);
  }
}

/**
 * Format a number for display in chart tooltips
 * Uses metric type detection for appropriate formatting
 */
export function formatChartTooltip(
  value: any,
  name?: string
): string {
  const metricType = detectMetricType(name);
  return formatMetricValue(value, metricType, name);
}

/**
 * Format a number for display in chart axes
 * Uses metric type detection for appropriate formatting
 */
export function formatChartAxis(
  value: any,
  metricKey?: string
): string {
  const metricType = detectMetricType(metricKey);
  return formatMetricValue(value, metricType, metricKey);
}

/**
 * Format a number in compact format (K, M, B, T)
 * Example: 1234 -> "1.23K", 1234567 -> "1.23M", 1234567890 -> "1.23B"
 *
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with suffix
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
  if (value === 0) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  // Trillion
  if (absValue >= 1_000_000_000_000) {
    return sign + (absValue / 1_000_000_000_000).toFixed(decimals) + 'T';
  }
  // Billion
  if (absValue >= 1_000_000_000) {
    return sign + (absValue / 1_000_000_000).toFixed(decimals) + 'B';
  }
  // Million
  if (absValue >= 1_000_000) {
    return sign + (absValue / 1_000_000).toFixed(decimals) + 'M';
  }
  // Thousand
  if (absValue >= 1_000) {
    return sign + (absValue / 1_000).toFixed(decimals) + 'K';
  }

  // Less than 1000 - format with decimals if it has them
  if (absValue % 1 !== 0) {
    return sign + absValue.toFixed(decimals);
  }

  return sign + absValue.toString();
}

/**
 * Format a number for display in metric cards
 * Uses compact format for large numbers, regular format for small numbers
 *
 * @param value - The numeric value to format
 * @param label - Optional label to help determine formatting
 * @returns Formatted string
 */
export function formatMetricCardValue(value: number, label?: string): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  const lowerLabel = label?.toLowerCase() || '';

  // For percentages, show with 1 decimal
  if (lowerLabel.includes('rate') || lowerLabel.includes('percent') || lowerLabel.includes('%')) {
    return absValue.toFixed(1);
  }

  // For very large numbers (≥1000), use compact format
  if (absValue >= 1_000) {
    return formatCompactNumber(value, 1);
  }

  // For small numbers with decimals (like eCPM), show 2 decimals
  if (absValue % 1 !== 0) {
    return absValue.toFixed(2);
  }

  // For small whole numbers, show as-is
  return Math.round(absValue).toString();
}

/**
 * Format a number for display in table cells
 * Automatically detects metric type from column key
 */
export function formatTableCell(
  value: any,
  columnKey?: string,
  customFormatter?: (value: any) => string
): string {
  // Use custom formatter if provided
  if (customFormatter) {
    return customFormatter(value);
  }

  // Otherwise use auto-detection
  return formatMetricValue(value, 'auto', columnKey);
}

/**
 * Format currency with $ prefix and 2 decimals
 * Example: 1234.56 -> "$1,234.56"
 */
export function formatCurrency(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }
  return '$' + formatRevenue(value);
}

/**
 * Format number with thousand separators (no decimals)
 * Example: 1234 -> "1,234"
 */
export function formatNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return formatCount(value);
}

/**
 * Format percentage with sign
 * Example: 15.5 -> "+15.5%", -10.2 -> "-10.2%"
 */
export function formatPercent(value: number, includeSign: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  const sign = includeSign && value > 0 ? '+' : '';
  return sign + value.toFixed(1) + '%';
}

/**
 * Safe toFixed - handles null/undefined values
 * Example: safeToFixed(123.456, 2) -> "123.46", safeToFixed(null, 2) -> "0.00"
 */
export function safeToFixed(value: any, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0.' + '0'.repeat(decimals);
  }
  return Number(value).toFixed(decimals);
}

/**
 * Safe number - handles null/undefined values and returns number
 * Example: safeNumber(123.456) -> 123.456, safeNumber(null) -> 0
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return defaultValue;
  }
  return Number(value);
}
