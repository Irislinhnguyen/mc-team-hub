/**
 * Secure Logger Utility
 *
 * Prevents sensitive data from being logged
 * Provides structured logging with automatic redaction
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogMetadata {
  [key: string]: any
}

/**
 * Sensitive field patterns to redact
 */
const SENSITIVE_PATTERNS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
  'private',
  'api_key',
  'access_token',
  'refresh_token',
  'session',
  'cookie',
  'authorization'
]

/**
 * Patterns that should only partially mask (show first/last few chars)
 */
const PARTIAL_MASK_PATTERNS = ['email', 'user', 'username']

/**
 * Check if a key contains sensitive information
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_PATTERNS.some(pattern => lowerKey.includes(pattern))
}

/**
 * Check if a key should be partially masked
 */
function shouldPartialMask(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return PARTIAL_MASK_PATTERNS.some(pattern => lowerKey.includes(pattern))
}

/**
 * Partially mask a string (show first and last 2 characters)
 */
function partialMask(value: string): string {
  if (value.length <= 6) {
    return '[REDACTED]'
  }
  return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`
}

/**
 * Recursively sanitize an object to remove sensitive data
 */
function sanitizeData(data: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]'
  }

  if (data === null || data === undefined) {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1))
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {}

    for (const [key, value] of Object.entries(data)) {
      // Fully redact sensitive keys
      if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Partially mask certain keys
      if (shouldPartialMask(key) && typeof value === 'string') {
        sanitized[key] = partialMask(value)
        continue
      }

      // Recursively sanitize nested objects
      sanitized[key] = sanitizeData(value, depth + 1)
    }

    return sanitized
  }

  return data
}

/**
 * Format log message with timestamp and level
 */
function formatLogMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString()
  const levelUpper = level.toUpperCase().padEnd(5)
  return `[${timestamp}] ${levelUpper} ${message}`
}

/**
 * Secure logger class
 */
class SecureLogger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: LogMetadata): void {
    const sanitized = metadata ? sanitizeData(metadata) : undefined
    const formattedMessage = formatLogMessage('info', message)

    if (sanitized) {
      console.log(formattedMessage, sanitized)
    } else {
      console.log(formattedMessage)
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    const sanitized = metadata ? sanitizeData(metadata) : undefined
    const formattedMessage = formatLogMessage('warn', message)

    if (sanitized) {
      console.warn(formattedMessage, sanitized)
    } else {
      console.warn(formattedMessage)
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    const sanitized = metadata ? sanitizeData(metadata) : undefined
    const formattedMessage = formatLogMessage('error', message)

    if (error instanceof Error) {
      console.error(formattedMessage, {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        ...sanitized
      })
    } else if (error) {
      console.error(formattedMessage, sanitizeData(error), sanitized)
    } else {
      console.error(formattedMessage, sanitized)
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (!this.isDevelopment) {
      return
    }

    const sanitized = metadata ? sanitizeData(metadata) : undefined
    const formattedMessage = formatLogMessage('debug', message)

    if (sanitized) {
      console.debug(formattedMessage, sanitized)
    } else {
      console.debug(formattedMessage)
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new SecureLogger()

/**
 * Export sanitize function for manual use
 */
export { sanitizeData }
