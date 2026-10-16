/**
 * Server-only environment variables
 * This file should ONLY be imported in server components and API routes
 * Using 'use server' directive enforces server-side execution
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/env.server.ts should only be used on the server side. ' +
    'If you see this error on the client, check your imports.'
  )
}

// Validate critical server-only variables
const requiredServerVars = ['SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL'] as const

// Provide Chapa configuration validation when present, without blocking local startup if not configured.
const chapaRequiredServerVars = ['CHAPA_SECRET_KEY', 'CHAPA_PUBLIC_KEY', 'CHAPA_MERCHANT_ID'] as const

for (const varName of chapaRequiredServerVars) {
  if (process.env[varName]) {
    continue
  }
}

for (const varName of requiredServerVars) {
  if (!process.env[varName]) {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
      `Please check your .env.local file and ensure all required variables are set.`
    )
  }
}

/**
 * Get Supabase service role key (server-only)
 * ⚠️  NEVER expose this to the client
 */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return key
}

/**
 * Get Supabase URL
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  return url
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

// Server-only environment variables are now securely loaded
