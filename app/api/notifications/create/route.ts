import { type NextRequest, NextResponse } from "next/server"
import { validateRequest } from "@/lib/schemas/validate"
import { CreateNotificationSchema } from "@/lib/schemas/orders"
import { getAuthUser, requireAnyRole } from "@/lib/auth/permissions"
import { logger } from "@/lib/logger"
import { rateLimiter } from "@/lib/rate-limit"
import { createNotificationsFromEvent } from "@/lib/notifications/create-notification"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      logger.warn('Rate limit exceeded on notifications/create')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authentication
    const user = await getAuthUser(request)
    if (!user) {
      logger.warn('Unauthorized access to notifications/create')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC - only authenticated users can create notifications
    const authCheck = await requireAnyRole(request, ['customer', 'seller', 'admin'])
    if (authCheck.error) {
      return authCheck.response
    }

    // Validate request
    const validation = await validateRequest(request, CreateNotificationSchema)
    if (!validation.success) {
      return validation.response
    }

    const result = await createNotificationsFromEvent(validation.data, user.id)

    if (!result.success) {
      logger.error('Error creating notifications', {
        userId: user.id,
        error: result.error,
      })
      return NextResponse.json({ error: result.error || 'Failed to create notifications' }, { status: 400 })
    }

    logger.logApiAccess('POST', '/api/notifications/create', 201, {
      userId: user.id,
      notificationCount: result.count,
    })

    return NextResponse.json({ success: true, notificationsCreated: result.count })
  } catch (error) {
    logger.error('Error in notifications/create', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
