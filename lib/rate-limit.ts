import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number // Time window in milliseconds
}

interface RequestRecord {
  count: number
  resetTime: number
}

class RateLimiter {
  private store: Map<string, RequestRecord> = new Map()
  private configs: Map<string, RateLimitConfig> = new Map()

  constructor() {
    // Clean up old entries every 60 seconds
    setInterval(() => this.cleanup(), 60000)

    // Configure default limits
    this.setConfig('auth', { maxRequests: 10, windowMs: 60 * 1000 }) // 10 per minute
    this.setConfig('api', { maxRequests: 100, windowMs: 60 * 1000 }) // 100 per minute
    this.setConfig('orders', { maxRequests: 50, windowMs: 60 * 60 * 1000 }) // 50 per hour
    this.setConfig('products', { maxRequests: 100, windowMs: 60 * 1000 }) // 100 per minute
  }

  setConfig(name: string, config: RateLimitConfig) {
    this.configs.set(name, config)
  }

  private getKey(request: NextRequest, prefix: string): string {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    return `${prefix}:${ip}`
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (record.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  async checkLimit(
    request: NextRequest,
    limitName: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const config = this.configs.get(limitName)
    if (!config) {
      logger.warn(`Rate limit config not found: ${limitName}`)
      return { allowed: true, remaining: config?.maxRequests || 100, resetTime: 0 }
    }

    const key = this.getKey(request, limitName)
    const now = Date.now()
    let record = this.store.get(key)

    // Initialize or reset if window expired
    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      }
    }

    record.count++
    this.store.set(key, record)

    const allowed = record.count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - record.count)

    if (!allowed) {
      logger.warn(`Rate limit exceeded: ${limitName}`, {
        key,
        count: record.count,
        limit: config.maxRequests,
      })
    }

    return {
      allowed,
      remaining,
      resetTime: record.resetTime,
    }
  }

  async middleware(limitName: string = 'api') {
    return async (request: NextRequest) => {
      const { allowed, remaining, resetTime } = await this.checkLimit(request, limitName)

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(this.configs.get(limitName)?.maxRequests || 100),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(resetTime),
            },
          }
        )
      }

      // Add rate limit info to response headers
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Remaining', String(remaining))
      response.headers.set(
        'X-RateLimit-Reset',
        String(resetTime)
      )

      return response
    }
  }
}

export const rateLimiter = new RateLimiter()
