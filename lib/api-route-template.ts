/**
 * API Route Security Template
 * Use this template when creating new API endpoints to ensure consistent security
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/schemas/validate'
import { getAuthUser, requireAnyRole } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'
import { rateLimiter } from '@/lib/rate-limit'
import { z } from 'zod'

// Define your input schema
const YourActionSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
  // Add your fields
})

type YourActionInput = z.infer<typeof YourActionSchema>

/**
 * Example: POST /api/your-endpoint
 * Description: What this endpoint does
 * Roles: customer, seller, admin
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      logger.warn('Rate limit exceeded on your-endpoint')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Step 2: Authentication
    const user = await getAuthUser(request)
    if (!user) {
      logger.warn('Unauthorized access to your-endpoint')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 3: Role-Based Access Control
    const authCheck = await requireAnyRole(request, ['customer', 'seller', 'admin'])
    if (authCheck.error) {
      logger.warn('Forbidden access to your-endpoint', {
        userId: user.id,
        userRole: user.role,
      })
      return authCheck.response
    }

    // Step 4: Input Validation
    const validation = await validateRequest(request, YourActionSchema)
    if (!validation.success) {
      logger.warn('Validation failed on your-endpoint', {
        userId: user.id,
      })
      return validation.response
    }

    const { field1, field2 } = validation.data

    // Step 5: Authorization (resource ownership)
    // Example: Check if user owns the resource
    // const ownsResource = await userOwnsResource(user.id, resourceId)
    // if (!ownsResource && user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    // Step 6: Business Logic
    const result = {
      field1,
      field2,
      userId: user.id,
      // Your result data
    }

    // Step 7: Logging
    logger.info('your-action completed', {
      userId: user.id,
      userRole: user.role,
      action: 'your_action',
      result: result,
    })

    // Step 8: Response
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    // Step 9: Error Logging
    logger.error('Error in your-endpoint', {
      error: error instanceof Error ? error.message : String(error),
    })

    // Return generic error to client (don't leak stack traces)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Example: GET /api/your-endpoint
 * Description: Fetch resource
 * Roles: All authenticated users
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authentication
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC
    const authCheck = await requireAnyRole(request, ['customer', 'seller', 'admin'])
    if (authCheck.error) {
      return authCheck.response
    }

    // Query parameters validation (optional)
    const { searchParams } = new URL(request.url)
    const querySchema = z.object({
      limit: z.coerce.number().int().positive().default(10),
      offset: z.coerce.number().int().nonnegative().default(0),
    })

    const queryValidation = querySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!queryValidation.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    const { limit, offset } = queryValidation.data

    // Your business logic
    const data: any[] = []

    logger.logApiAccess('GET', '/api/your-endpoint', 200, {
      userId: user.id,
      limit,
      offset,
    })

    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error in GET your-endpoint', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * CHECKLIST FOR NEW API ROUTES:
 * 
 * ✅ Rate limiting enabled
 * ✅ Authentication verified
 * ✅ RBAC enforced with requireAnyRole()
 * ✅ Input validated with Zod schema
 * ✅ Resource ownership checked (if applicable)
 * ✅ Business logic implemented
 * ✅ Action logged with logger
 * ✅ Generic error response (no stack traces)
 * ✅ Proper HTTP status codes
 * ✅ No hardcoded secrets
 * ✅ No console.log() statements (use logger instead)
 */
