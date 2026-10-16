import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

const DEFAULT_DELETE_AFTER_HOURS = 72
const WARNING_BEFORE_DELETION_HOURS = 24

function getDeleteAfterHours() {
  const fromEnv = Number(process.env.ORDER_PENDING_DELETE_AFTER_HOURS)
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv
  }
  return DEFAULT_DELETE_AFTER_HOURS
}

// Vercel Cron: configured in vercel.json
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error("CRON_SECRET is missing for cleanup-orders cron route")
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron access to cleanup-orders')
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()
    const deleteAfterHours = getDeleteAfterHours()
    const deleteAfterMs = deleteAfterHours * 60 * 60 * 1000
    const warningEnabled = deleteAfterHours > WARNING_BEFORE_DELETION_HOURS

    // Find pending orders created before the configured expiration window.
    const deleteCutoff = new Date(Date.now() - deleteAfterMs).toISOString()
    const warningCutoff = warningEnabled
      ? new Date(Date.now() - (deleteAfterMs - WARNING_BEFORE_DELETION_HOURS * 60 * 60 * 1000)).toISOString()
      : null

    logger.logOrder('cleanup_started', 'batch', {
      deleteCutoff,
      deleteAfterHours,
      warningCutoff,
    })

    // Send seller warning notifications one day before auto-deletion.
    let warningNotificationsSent = 0
    if (warningEnabled && warningCutoff) {
      const { data: warningCandidates, error: warningFetchError } = await adminClient
        .from("orders")
        .select("id, created_at")
        .eq("status", "pending")
        .lt("created_at", warningCutoff)
        .gte("created_at", deleteCutoff)

      if (warningFetchError) {
        logger.error('Error fetching warning candidates for cleanup-orders cron', {
          error: warningFetchError.message,
        })
      } else if (warningCandidates && warningCandidates.length > 0) {
        const warningOrderIds = warningCandidates.map((order) => order.id)

        const { data: warningItems, error: warningItemsError } = await adminClient
          .from("order_items")
          .select("order_id, products(seller_id)")
          .in("order_id", warningOrderIds)

        if (warningItemsError) {
          logger.error('Error fetching warning order items for cleanup-orders cron', {
            error: warningItemsError.message,
          })
        } else {
          const { data: existingWarningNotifications, error: existingWarningsError } = await adminClient
            .from("notifications")
            .select("order_id, user_id")
            .eq("type", "order_deletion_warning_seller")
            .in("order_id", warningOrderIds)

          if (existingWarningsError) {
            logger.error('Error fetching existing warning notifications for cleanup-orders cron', {
              error: existingWarningsError.message,
            })
          } else {
            const existingPairs = new Set(
              (existingWarningNotifications || []).map((n) => `${n.order_id}:${n.user_id}`),
            )

            const warningNotifications: Array<{
              user_id: string
              type: "order_deletion_warning_seller"
              title: string
              message: string
              order_id: string
              is_read: false
              created_at: string
            }> = []

            for (const item of warningItems || []) {
              const product = Array.isArray(item.products) ? item.products[0] : item.products
              const sellerId = product?.seller_id
              if (!sellerId) continue

              const pairKey = `${item.order_id}:${sellerId}`
              if (existingPairs.has(pairKey)) continue

              warningNotifications.push({
                user_id: sellerId,
                type: "order_deletion_warning_seller",
                title: "Order Expiring Soon",
                message:
                  "A pending order will be auto-deleted in about 24 hours. Please complete the order before deletion.",
                order_id: item.order_id,
                is_read: false,
                created_at: new Date().toISOString(),
              })

              existingPairs.add(pairKey)
            }

            if (warningNotifications.length > 0) {
              const { error: insertWarningError } = await adminClient
                .from("notifications")
                .insert(warningNotifications)

              if (insertWarningError) {
                logger.error('Error inserting seller warning notifications for cleanup-orders cron', {
                  error: insertWarningError.message,
                })
              } else {
                warningNotificationsSent = warningNotifications.length
              }
            }
          }
        }
      }
    }

    // Get all pending orders older than the configured deletion threshold.
    const { data: oldPendingOrders, error: fetchError } = await adminClient
      .from("orders")
      .select("id, customer_id, total_amount, created_at")
      .eq("status", "pending")
      .lt("created_at", deleteCutoff)

    if (fetchError) {
      logger.error('Error fetching old pending orders for cron cleanup', {
        error: fetchError.message,
      })
      throw fetchError
    }

    if (!oldPendingOrders || oldPendingOrders.length === 0) {
      logger.logOrder('cleanup_completed', 'batch', { cleanedCount: 0 })
      return NextResponse.json({
        message: "No orders to cleanup",
        deleted: 0,
        warningNotificationsSent,
      })
    }

    logger.logOrder('cleanup_found_orders', 'batch', { count: oldPendingOrders.length })

    // Get order items for these orders to notify sellers
    const orderIds = oldPendingOrders.map((o) => o.id)

    const { data: orderItems, error: itemsError } = await adminClient
      .from("order_items")
      .select("order_id, product_id, quantity, products(seller_id, name)")
      .in("order_id", orderIds)

    if (itemsError) {
      logger.error('Error fetching order items for cron cleanup', {
        error: itemsError.message,
      })
      throw itemsError
    }

    // Create notifications for customers
    const customerNotifications = oldPendingOrders.map((order) => ({
      user_id: order.customer_id,
      type: "order_expired_customer" as const,
      title: "Order Cancelled",
      message: `Your order from ${new Date(order.created_at).toLocaleDateString()} for $${order.total_amount} has been cancelled due to non-payment.`,
      order_id: order.id,
      is_read: false,
      created_at: new Date().toISOString(),
    }))

    // Create notifications for sellers
    const sellerNotificationsMap = new Map<string, {
      user_id: string
      type: "order_expired_seller"
      title: string
      message: string
      order_id: string
      is_read: boolean
      created_at: string
    }>()

    if (orderItems) {
      orderItems.forEach((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        const sellerId = product?.seller_id
        const productName = product?.name || "Unknown Product"
        const key = `${sellerId}:${item.order_id}`

        if (sellerId && !sellerNotificationsMap.has(key)) {
          sellerNotificationsMap.set(key, {
            user_id: sellerId,
            type: "order_expired_seller",
            title: "Order Cancelled",
            message: `An order containing "${productName}" was automatically cancelled due to non-payment.`,
            order_id: item.order_id,
            is_read: false,
            created_at: new Date().toISOString(),
          })
        }
      })
    }

    // Insert all notifications
    const allNotifications = [...customerNotifications, ...Array.from(sellerNotificationsMap.values())]

    const { error: notifError } = await adminClient.from("notifications").insert(allNotifications)

    if (notifError) {
      logger.error('Error creating cleanup notifications in cron', {
        error: notifError.message,
      })
      throw notifError
    }

    // Delete dependent items first to avoid foreign key failures.
    const { error: deleteItemsError } = await adminClient.from("order_items").delete().in("order_id", orderIds)

    if (deleteItemsError) {
      logger.error('Error deleting order items in cron cleanup', {
        error: deleteItemsError.message,
        ordersCount: orderIds.length,
      })
      throw deleteItemsError
    }

    // Delete the old pending orders.
    const { error: deleteError } = await adminClient.from("orders").delete().in("id", orderIds)

    if (deleteError) {
      logger.error('Error deleting orders in cron cleanup', {
        error: deleteError.message,
        ordersCount: orderIds.length,
      })
      throw deleteError
    }

    logger.logOrder('cleanup_completed', 'batch', {
      cleanedCount: orderIds.length,
      notificationsCount: allNotifications.length,
      warningNotificationsSent,
    })

    return NextResponse.json({
      message: "Cleanup completed successfully",
      deleted: orderIds.length,
      notificationsSent: allNotifications.length,
      warningNotificationsSent,
      deleteAfterHours,
    })
  } catch (error) {
    logger.error('Error in cleanup cron job', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
