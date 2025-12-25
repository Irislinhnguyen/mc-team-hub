/**
 * Table Formatter for Console Reports
 *
 * Generates ASCII tables for backtest reports
 */

/**
 * Format a table with borders
 * @param {Array<Object>} rows - Array of row objects
 * @param {Array<{key: string, header: string, width?: number, align?: 'left'|'right'|'center'}>} columns - Column definitions
 * @returns {string} Formatted table
 */
function formatTable(rows, columns) {
  // Calculate column widths
  const widths = columns.map(col => {
    const headerWidth = col.header.length;
    const maxContentWidth = Math.max(
      ...rows.map(row => String(row[col.key] || '').length)
    );
    return col.width || Math.max(headerWidth, maxContentWidth, 8);
  });

  // Create separator line
  const separator = '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const middleSeparator = '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const bottomSeparator = '└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

  // Create header
  const header = '│ ' + columns.map((col, i) => {
    return padString(col.header, widths[i], col.align || 'left');
  }).join(' │ ') + ' │';

  // Create rows
  const bodyRows = rows.map(row => {
    return '│ ' + columns.map((col, i) => {
      const value = row[col.key] !== undefined && row[col.key] !== null
        ? String(row[col.key])
        : '';
      return padString(value, widths[i], col.align || 'left');
    }).join(' │ ') + ' │';
  });

  // Assemble table
  return [
    separator,
    header,
    middleSeparator,
    ...bodyRows,
    bottomSeparator
  ].join('\n');
}

/**
 * Pad string to specific width with alignment
 */
function padString(str, width, align = 'left') {
  const len = str.length;
  if (len >= width) return str.substring(0, width);

  const padding = ' '.repeat(width - len);

  if (align === 'right') {
    return padding + str;
  } else if (align === 'center') {
    const leftPad = Math.floor((width - len) / 2);
    const rightPad = width - len - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  } else {
    return str + padding;
  }
}

/**
 * Format a simple key-value list
 */
function formatKeyValue(pairs, keyWidth = 25) {
  return pairs.map(({ key, value }) => {
    const paddedKey = padString(key + ':', keyWidth, 'left');
    return `${paddedKey} ${value}`;
  }).join('\n');
}

/**
 * Format a section header
 */
function formatSectionHeader(title, width = 80) {
  const line = '─'.repeat(width);
  const padding = Math.floor((width - title.length - 2) / 2);
  const centeredTitle = ' '.repeat(padding) + title + ' '.repeat(padding);
  return `\n${line}\n${centeredTitle}\n${line}`;
}

/**
 * Format a box around content
 */
function formatBox(content, title = '', width = 80) {
  const lines = content.split('\n');
  const top = '╔' + '═'.repeat(width - 2) + '╗';
  const bottom = '╚' + '═'.repeat(width - 2) + '╝';

  let result = [top];

  if (title) {
    const titlePadding = Math.floor((width - title.length - 4) / 2);
    const titleLine = '║ ' + ' '.repeat(titlePadding) + title + ' '.repeat(titlePadding) + ' ║';
    result.push(titleLine);
    result.push('╠' + '═'.repeat(width - 2) + '╣');
  }

  lines.forEach(line => {
    const paddedLine = padString(line, width - 4, 'left');
    result.push('║ ' + paddedLine + ' ║');
  });

  result.push(bottom);

  return result.join('\n');
}

/**
 * Format percentage with color indicators
 */
function formatPercentage(value, thresholds = { excellent: 10, good: 15, acceptable: 25 }) {
  const num = parseFloat(value);
  let indicator = '';

  if (num < thresholds.excellent) {
    indicator = '✓';
  } else if (num < thresholds.good) {
    indicator = '✓';
  } else if (num < thresholds.acceptable) {
    indicator = '⚠';
  } else {
    indicator = '✗';
  }

  return `${num.toFixed(1)}% ${indicator}`;
}

/**
 * Format number with thousands separator
 */
function formatNumber(value, decimals = 0) {
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Create a horizontal bar chart (simple ASCII)
 */
function formatBarChart(items, maxWidth = 50) {
  const maxValue = Math.max(...items.map(item => item.value));

  return items.map(item => {
    const barWidth = Math.round((item.value / maxValue) * maxWidth);
    const bar = '█'.repeat(barWidth);
    const label = padString(item.label, 20, 'left');
    const value = padString(String(item.value), 10, 'right');
    return `${label} ${bar} ${value}`;
  }).join('\n');
}

module.exports = {
  formatTable,
  formatKeyValue,
  formatSectionHeader,
  formatBox,
  formatPercentage,
  formatNumber,
  formatBarChart,
  padString
};
