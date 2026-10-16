import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/permissions"
import { logger } from "@/lib/logger"
import { rateLimiter } from "@/lib/rate-limit"
import { z } from "zod"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { allowed } = await rateLimiter.checkLimit(request, "api")
    if (!allowed) {
      logger.warn("Rate limit exceeded on notifications/[id]/read")
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const user = await getAuthUser(request)
    if (!user) {
      logger.warn("Unauthorized access to notifications/[id]/read")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notificationIdSchema = z.string().uuid("Invalid notification ID")
    const idValidation = notificationIdSchema.safeParse(id)

    if (!idValidation.success) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      logger.error("Error marking notification as read", {
        userId: user.id,
        notificationId: id,
        error: error.message,
      })
      return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 })
    }

    logger.logApiAccess("PATCH", `/api/notifications/${id}/read`, 200, {
      userId: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error in notification read endpoint", {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
