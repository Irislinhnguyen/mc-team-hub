/**
 * Rate Limiting Middleware
 *
 * Provides protection against brute force and DoS attacks
 * Uses in-memory storage (suitable for single-instance deployments)
 * For production multi-instance, consider using Redis/Upstash
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// For production: Replace with Redis/Upstash for distributed systems
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number

  /**
   * Time window in milliseconds
   */
  windowMs: number

  /**
   * Custom key generator (default: uses IP address)
   */
  keyGenerator?: (request: NextRequest) => string

  /**
   * Custom error message
   */
  message?: string
}

/**
 * Get client identifier (IP address or custom key)
 */
function getClientKey(request: NextRequest, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(request)
  }

  // Try to get real IP from headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  return ip
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(request: NextRequest, config: RateLimitConfig): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const key = getClientKey(request, config)
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    }
    rateLimitStore.set(key, entry)
  }

  // Increment counter
  entry.count++

  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime
  }
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<Response> => {
    const { allowed, remaining, resetTime } = checkRateLimit(request, config)

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

      return NextResponse.json(
        {
          error: config.message || 'Too many requests, please try again later',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(resetTime).toISOString()
          }
        }
      )
    }

    // Add rate limit headers to successful response
    const response = await handler(request)

    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())

    return response
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * For authentication endpoints (login, password reset)
   * 5 attempts per 15 minutes
   */
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },

  /**
   * For general API endpoints
   * 100 requests per minute
   */
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.'
  },

  /**
   * For expensive operations (BigQuery, AI)
   * 10 requests per minute
   */
  expensive: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Rate limit exceeded for this operation. Please wait before retrying.'
  }
}
