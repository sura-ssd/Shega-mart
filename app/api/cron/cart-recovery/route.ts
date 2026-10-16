import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error("CRON_SECRET is missing for cart-recovery cron route")
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    logger.warn("Unauthorized cron access to cart-recovery")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: staleCartItems, error: staleCartItemsError } = await adminClient
      .from("cart_items")
      .select("user_id, product_id, quantity, created_at, products(name, price)")
      .lt("created_at", twoHoursAgo)

    if (staleCartItemsError) {
      logger.error("Failed to fetch stale cart items for cart-recovery cron", {
        error: staleCartItemsError.message,
      })
      return NextResponse.json({ error: "Failed to load cart items" }, { status: 400 })
    }

    if (!staleCartItems || staleCartItems.length === 0) {
      return NextResponse.json({ message: "No stale carts found", remindersSent: 0 })
    }

    const groupedByUser = new Map<
      string,
      Array<{
        product_id: string
        quantity: number
        product_name: string
        price: number
      }>
    >()

    for (const row of staleCartItems as any[]) {
      const userId = row.user_id as string
      const product = Array.isArray(row.products) ? row.products[0] : row.products
      const existing = groupedByUser.get(userId) || []
      existing.push({
        product_id: row.product_id,
        quantity: Number(row.quantity || 0),
        product_name: String(product?.name || "Item"),
        price: Number(product?.price || 0),
      })
      groupedByUser.set(userId, existing)
    }

    const userIds = Array.from(groupedByUser.keys())

    const { data: recentReminders, error: remindersError } = await adminClient
      .from("cart_recovery_reminders")
      .select("user_id, reminded_at")
      .in("user_id", userIds)
      .gte("reminded_at", oneDayAgo)

    if (remindersError) {
      logger.error("Failed to fetch recent cart reminders", {
        error: remindersError.message,
      })
    }

    const remindedRecently = new Set((recentReminders || []).map((row: any) => row.user_id as string))

    const notificationsToInsert: Array<{
      user_id: string
      type: string
      title: string
      message: string
      is_read: boolean
      created_at: string
    }> = []

    const remindersToInsert: Array<{
      user_id: string
      reminder_type: string
      cart_item_count: number
      cart_total_amount: number
      snapshot: unknown
      reminded_at: string
    }> = []

    for (const [userId, items] of groupedByUser.entries()) {
      if (remindedRecently.has(userId)) {
        continue
      }

      const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)
      const cartTotalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const topItems = items.slice(0, 2).map((item) => item.product_name)

      notificationsToInsert.push({
        user_id: userId,
        type: "cart_recovery",
        title: "You left items in your cart",
        message:
          topItems.length > 0
            ? `Your cart is waiting: ${topItems.join(", ")}${items.length > 2 ? " and more" : ""}. Complete checkout before stock runs out.`
            : "Your cart is waiting. Complete checkout before stock runs out.",
        is_read: false,
        created_at: new Date().toISOString(),
      })

      remindersToInsert.push({
        user_id: userId,
        reminder_type: "abandoned_cart",
        cart_item_count: cartItemCount,
        cart_total_amount: Number(cartTotalAmount.toFixed(2)),
        snapshot: items,
        reminded_at: new Date().toISOString(),
      })
    }

    if (notificationsToInsert.length === 0) {
      return NextResponse.json({ message: "No reminders due right now", remindersSent: 0 })
    }

    const { error: notificationsError } = await adminClient.from("notifications").insert(notificationsToInsert)

    if (notificationsError) {
      logger.error("Failed to insert cart recovery notifications", {
        error: notificationsError.message,
      })
      return NextResponse.json({ error: "Failed to send reminders" }, { status: 400 })
    }

    const { error: insertRemindersError } = await adminClient
      .from("cart_recovery_reminders")
      .insert(remindersToInsert)

    if (insertRemindersError) {
      logger.error("Failed to record cart recovery reminder logs", {
        error: insertRemindersError.message,
      })
    }

    return NextResponse.json({
      message: "Cart recovery reminders sent",
      remindersSent: notificationsToInsert.length,
    })
  } catch (error) {
    logger.error("Error in cart-recovery cron", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
