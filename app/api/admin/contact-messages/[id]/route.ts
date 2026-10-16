import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getAuthUser, requireRole } from "@/lib/auth/permissions"
import { rateLimiter } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const UpdateMessageStatusSchema = z.object({
  status: z.enum(["read", "replied"]).optional(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { allowed } = await rateLimiter.checkLimit(request, "api")
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authCheck = await requireRole("admin")(request)
    if (authCheck.error) {
      return authCheck.response
    }

    const { id } = await context.params

    let nextStatus: "read" | "replied" = "read"
    if (request.headers.get("content-length") !== "0") {
      const body = await request.json().catch(() => ({}))
      const parsed = UpdateMessageStatusSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: parsed.error.flatten(),
          },
          { status: 400 },
        )
      }

      nextStatus = parsed.data.status || "read"
    }

    const adminClient = createAdminClient()
    const updatePayload: { status: "read" | "replied"; read_at?: string; replied_at?: string } = {
      status: nextStatus,
    }

    const now = new Date().toISOString()
    if (nextStatus === "read") {
      updatePayload.read_at = now
    }
    if (nextStatus === "replied") {
      updatePayload.replied_at = now
    }

    const { data, error } = await adminClient
      .from("contact_messages")
      .update(updatePayload)
      .eq("id", id)
      .select("id, status")
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Message not found or update failed" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: data })
  } catch (error) {
    logger.error("Error updating contact message status", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
