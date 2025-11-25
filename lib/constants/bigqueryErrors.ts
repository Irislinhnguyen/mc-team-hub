/**
 * BigQuery Error Reference
 *
 * Comprehensive mapping of BigQuery error patterns to solutions
 * Used by AI to understand and fix errors automatically
 */

export interface ErrorPattern {
  pattern: RegExp
  type: 'column' | 'syntax' | 'table' | 'permission' | 'timeout' | 'quota' | 'semantic'
  retryable: boolean
  autoFixable: boolean
  commonCauses: string[]
  suggestedFixes: string[]
  aiHint: string
}

export const BIGQUERY_ERROR_PATTERNS: ErrorPattern[] = [
  // Column Errors
  {
    pattern: /Unrecognized name: (\w+)/i,
    type: 'column',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Column name typo',
      'Using alias before definition',
      'Column does not exist in table'
    ],
    suggestedFixes: [
      'Check valid columns: date, pic, pid, pubname, mid, medianame, zid, zonename, rev, profit, paid, req, request_CPM, month, year',
      'Common typos: mname→medianame, pname→pubname, zname→zonename, revenue→rev'
    ],
    aiHint: 'Extract the invalid column name from error and suggest the closest valid column'
  },
  {
    pattern: /Name (\w+) not found inside/i,
    type: 'column',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Table alias used incorrectly',
      'Column referenced before JOIN'
    ],
    suggestedFixes: [
      'Verify table aliases (p for pub_data, u for updated_product_name)',
      'Ensure JOIN is correct before referencing columns'
    ],
    aiHint: 'Check table alias usage and JOIN order'
  },
  {
    pattern: /Column (\w+) is ambiguous/i,
    type: 'column',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Same column name in multiple tables',
      'Missing table alias prefix'
    ],
    suggestedFixes: [
      'Add table alias prefix (e.g., p.pid instead of pid)',
      'Use fully qualified column names'
    ],
    aiHint: 'Add appropriate table alias to disambiguate'
  },

  // Syntax Errors
  {
    pattern: /Syntax error: Expected/i,
    type: 'syntax',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Missing keyword (FROM, WHERE, GROUP BY)',
      'Unmatched parentheses',
      'Invalid SQL structure'
    ],
    suggestedFixes: [
      'Check SQL structure: SELECT ... FROM ... WHERE ... GROUP BY ...',
      'Verify all parentheses are matched',
      'Check for missing commas between columns'
    ],
    aiHint: 'Parse the expected token and fix the syntax'
  },
  {
    pattern: /Syntax error: Unexpected/i,
    type: 'syntax',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Extra keyword or symbol',
      'Wrong keyword order',
      'Invalid character'
    ],
    suggestedFixes: [
      'Remove unexpected token',
      'Check keyword order: SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT'
    ],
    aiHint: 'Identify and remove or relocate the unexpected token'
  },
  {
    pattern: /SELECT list expression references.*must appear in GROUP BY/i,
    type: 'syntax',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Non-aggregated column in SELECT with GROUP BY',
      'Missing column in GROUP BY clause'
    ],
    suggestedFixes: [
      'Add missing columns to GROUP BY',
      'OR wrap column in aggregate function (MAX, MIN, ANY_VALUE)'
    ],
    aiHint: 'Either add the column to GROUP BY or use an aggregate function'
  },

  // Table Errors
  {
    pattern: /Table.*was not found/i,
    type: 'table',
    retryable: false,
    autoFixable: false,
    commonCauses: [
      'Incorrect dataset or table name',
      'Table does not exist'
    ],
    suggestedFixes: [
      'Valid tables: analysis-1.main_data.pub_data, analysis-1.main_data.updated_product_name',
      'Check dataset name: analysis-1.main_data'
    ],
    aiHint: 'Verify table name against known tables'
  },
  {
    pattern: /Dataset.*was not found/i,
    type: 'table',
    retryable: false,
    autoFixable: false,
    commonCauses: [
      'Incorrect dataset name',
      'Dataset does not exist'
    ],
    suggestedFixes: [
      'Use correct dataset: analysis-1.main_data',
      'Format: project.dataset.table'
    ],
    aiHint: 'Dataset name is fixed, cannot be changed'
  },

  // Permission Errors
  {
    pattern: /Access Denied/i,
    type: 'permission',
    retryable: false,
    autoFixable: false,
    commonCauses: [
      'Service account lacks permissions',
      'IAM policy issue'
    ],
    suggestedFixes: [
      'Contact administrator to check BigQuery permissions',
      'Verify service account roles'
    ],
    aiHint: 'Cannot fix automatically - permission issue'
  },

  // Timeout Errors
  {
    pattern: /Query exceeded resource limits/i,
    type: 'timeout',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Query too complex',
      'Processing too much data',
      'Missing date filters'
    ],
    suggestedFixes: [
      'Add date range filter: WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
      'Add LIMIT clause',
      'Simplify aggregations'
    ],
    aiHint: 'Simplify query or add date/limit constraints'
  },
  {
    pattern: /deadline exceeded/i,
    type: 'timeout',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Query taking too long',
      'Network timeout'
    ],
    suggestedFixes: [
      'Add stricter date filters',
      'Reduce data scope',
      'Retry with simpler query'
    ],
    aiHint: 'Reduce query scope and retry'
  },
  {
    pattern: /ETIMEDOUT|ECONNRESET|ENOTFOUND/i,
    type: 'timeout',
    retryable: true,
    autoFixable: false,
    commonCauses: [
      'Network connectivity issue',
      'BigQuery service temporarily unavailable'
    ],
    suggestedFixes: [
      'Wait and retry',
      'Check network connectivity'
    ],
    aiHint: 'Transient network error - retry automatically'
  },

  // Quota Errors
  {
    pattern: /Quota exceeded/i,
    type: 'quota',
    retryable: true,
    autoFixable: false,
    commonCauses: [
      'Daily quota limit reached',
      'Concurrent query limit'
    ],
    suggestedFixes: [
      'Wait for quota reset',
      'Reduce query frequency'
    ],
    aiHint: 'Quota error - wait and retry with backoff'
  },
  {
    pattern: /rateLimitExceeded/i,
    type: 'quota',
    retryable: true,
    autoFixable: false,
    commonCauses: [
      'Too many requests in short time'
    ],
    suggestedFixes: [
      'Wait 1-2 seconds and retry'
    ],
    aiHint: 'Rate limit - retry with exponential backoff'
  },

  // Semantic Errors
  {
    pattern: /No matching signature for function/i,
    type: 'semantic',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Wrong data type for function',
      'Incorrect number of arguments'
    ],
    suggestedFixes: [
      'Check function signature and argument types',
      'Cast values if needed: CAST(x AS STRING)'
    ],
    aiHint: 'Check function documentation and fix arguments'
  },
  {
    pattern: /Cannot (coerce|convert|cast)/i,
    type: 'semantic',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Type mismatch in comparison or operation',
      'Invalid date format'
    ],
    suggestedFixes: [
      'Use explicit CAST() or SAFE_CAST()',
      'Check date formats: DATE("2024-01-01")'
    ],
    aiHint: 'Add appropriate type casting'
  },
  {
    pattern: /Division by zero/i,
    type: 'semantic',
    retryable: true,
    autoFixable: true,
    commonCauses: [
      'Dividing by column that can be 0'
    ],
    suggestedFixes: [
      'Use SAFE_DIVIDE(a, b) instead of a/b',
      'Add NULLIF(b, 0) to prevent division by zero'
    ],
    aiHint: 'Replace division with SAFE_DIVIDE'
  }
]

/**
 * Common column name fixes
 */
export const COLUMN_NAME_FIXES: Record<string, string> = {
  // Common typos
  'mname': 'medianame',
  'pname': 'pubname',
  'zname': 'zonename',
  'revenue': 'rev',
  'impressions': 'req',
  'requests': 'req',
  'mtype': 'product',
  'media_name': 'medianame',
  'pub_name': 'pubname',
  'zone_name': 'zonename',
  'publisher': 'pubname',
  'media': 'medianame',
  'zone': 'zonename',

  // Non-existent columns
  'team': 'pic',  // team doesn't exist, use pic
  'quarter': 'month',  // quarter doesn't exist, calculate from month
  'total_revenue': 'rev',
  'total_rev': 'rev',
  'total_profit': 'profit'
}

/**
 * Valid columns per table
 */
export const VALID_COLUMNS = {
  pub_data: [
    'date', 'pic', 'pid', 'pubname', 'mid', 'medianame',
    'zid', 'zonename', 'rev', 'profit', 'paid', 'req',
    'request_CPM', 'month', 'year'
  ],
  updated_product_name: [
    'pid', 'pubname', 'mid', 'medianame', 'zid', 'zonename',
    'H5', 'product'
  ]
}

/**
 * Classify an error message
 */
export function classifyError(errorMessage: string): {
  type: string
  retryable: boolean
  autoFixable: boolean
  pattern: ErrorPattern | null
  extractedInfo: Record<string, string>
} {
  const extractedInfo: Record<string, string> = {}

  for (const errorPattern of BIGQUERY_ERROR_PATTERNS) {
    const match = errorMessage.match(errorPattern.pattern)
    if (match) {
      // Extract captured groups
      if (match[1]) {
        extractedInfo.column = match[1]
        extractedInfo.table = match[2] || ''
      }

      return {
        type: errorPattern.type,
        retryable: errorPattern.retryable,
        autoFixable: errorPattern.autoFixable,
        pattern: errorPattern,
        extractedInfo
      }
    }
  }

  // Default: unknown error, not retryable
  return {
    type: 'unknown',
    retryable: false,
    autoFixable: false,
    pattern: null,
    extractedInfo
  }
}

/**
 * Get fix suggestion for an error
 */
export function getFixSuggestion(errorMessage: string): string {
  const classification = classifyError(errorMessage)

  if (!classification.pattern) {
    return 'Unknown error. Please check the SQL syntax and column names.'
  }

  const { pattern, extractedInfo } = classification

  let suggestion = `Error type: ${pattern.type}\n\n`
  suggestion += `Common causes:\n${pattern.commonCauses.map(c => `- ${c}`).join('\n')}\n\n`
  suggestion += `Suggested fixes:\n${pattern.suggestedFixes.map(f => `- ${f}`).join('\n')}`

  // Add specific column fix if applicable
  if (extractedInfo.column && COLUMN_NAME_FIXES[extractedInfo.column.toLowerCase()]) {
    suggestion += `\n\nSpecific fix: Replace "${extractedInfo.column}" with "${COLUMN_NAME_FIXES[extractedInfo.column.toLowerCase()]}"`
  }

  return suggestion
}

/**
 * Check if an error is transient (worth retrying without changes)
 */
export function isTransientError(errorMessage: string): boolean {
  const transientPatterns = [
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /ENOTFOUND/i,
    /rateLimitExceeded/i,
    /temporarily unavailable/i,
    /service unavailable/i,
    /internal error/i,
    /backendError/i
  ]

  return transientPatterns.some(p => p.test(errorMessage))
}

/**
 * Get AI context for error fixing
 */
export function getAIErrorContext(errorMessage: string): string {
  const classification = classifyError(errorMessage)

  if (!classification.pattern) {
    return `
Unknown error occurred. Check:
1. Column names are valid
2. SQL syntax is correct
3. Table names are correct
4. Date formats are proper
`
  }

  const { pattern, extractedInfo } = classification

  return `
ERROR TYPE: ${pattern.type}
RETRYABLE: ${pattern.retryable}
AUTO-FIXABLE: ${pattern.autoFixable}

AI HINT: ${pattern.aiHint}

${extractedInfo.column ? `INVALID COLUMN DETECTED: "${extractedInfo.column}"` : ''}
${extractedInfo.column && COLUMN_NAME_FIXES[extractedInfo.column.toLowerCase()]
  ? `SUGGESTED REPLACEMENT: "${COLUMN_NAME_FIXES[extractedInfo.column.toLowerCase()]}"`
  : ''}

COMMON CAUSES:
${pattern.commonCauses.map(c => `- ${c}`).join('\n')}

SUGGESTED FIXES:
${pattern.suggestedFixes.map(f => `- ${f}`).join('\n')}
`
}
