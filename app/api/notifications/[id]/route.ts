import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/permissions"
import { logger } from "@/lib/logger"
import { rateLimiter } from "@/lib/rate-limit"
import { z } from "zod"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ FIX

    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      logger.warn('Rate limit exceeded on notifications/[id]')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authentication
    const user = await getAuthUser(request)
    if (!user) {
      logger.warn('Unauthorized access to notifications/[id]')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate notification ID
    const notificationIdSchema = z.string().uuid('Invalid notification ID')
    const idValidation = notificationIdSchema.safeParse(id) // ✅ use id

    if (!idValidation.success) {
      logger.warn('Invalid notification ID format', {
        userId: user.id,
        id: id, // ✅ fixed
      })
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      logger.error('Error deleting notification', {
        userId: user.id,
        notificationId: id,
        error: error.message,
        errorCode: error.code,
      })
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      )
    }

    logger.logApiAccess('DELETE', `/api/notifications/${id}`, 200, {
      userId: user.id,
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error in notification delete', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
