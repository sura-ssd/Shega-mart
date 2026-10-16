import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getAuthUser, requireRole } from "@/lib/auth/permissions"
import { rateLimiter } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { createNotification } from "@/lib/notifications/create-notification"

const ModerateProductSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
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

    const body = await request.json()
    const parsed = ModerateProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    const { id } = await context.params
    const { action, notes } = parsed.data

    const adminClient = createAdminClient()

    const { data: product, error: productError } = await adminClient
      .from("products")
      .select("id, name, seller_id")
      .eq("id", id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const moderationStatus = action === "approve" ? "approved" : "rejected"

    const { data: updatedProduct, error: updateError } = await adminClient
      .from("products")
      .update({
        moderation_status: moderationStatus,
        moderation_notes: notes ?? null,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        is_active: action === "approve",
      })
      .eq("id", id)
      .select("id, name, moderation_status, is_active, moderated_at")
      .single()

    if (updateError) {
      logger.error("Failed to moderate product", {
        adminId: user.id,
        productId: id,
        action,
        error: updateError.message,
      })
      return NextResponse.json({ error: "Failed to moderate product" }, { status: 400 })
    }

    await createNotification({
      user_id: product.seller_id,
      title: action === "approve" ? "Product Approved" : "Product Rejected",
      message:
        action === "approve"
          ? `Your product \"${product.name}\" is approved and now visible to customers.`
          : `Your product \"${product.name}\" was rejected by moderation. Update details and resubmit.`,
      type: action === "approve" ? "product_moderation_approved" : "product_moderation_rejected",
    })

    logger.info("Product moderated", {
      adminId: user.id,
      productId: id,
      action,
    })

    return NextResponse.json({ success: true, product: updatedProduct })
  } catch (error) {
    logger.error("Error in admin moderation route", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
