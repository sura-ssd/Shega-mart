import { createAdminClient } from "@/lib/supabase/server-admin"
import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

// This endpoint should be called by a cron job every hour
// Vercel Cron: https://vercel.com/docs/cron-jobs
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error("CRON_SECRET is missing for cleanup-pending route")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron access to orders/cleanup-pending', {
        hasAuth: !!authHeader,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Find all pending orders created more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    logger.logOrder('cleanup_started', 'batch', { cutoffTime: twentyFourHoursAgo })

    // Fetch pending orders older than 24 hours with related data
    const { data: oldOrders, error: fetchError } = await adminClient
      .from("orders")
      .select(
        `
        id,
        customer_id,
        customer_email,
        customer_name,
        total_amount,
        created_at,
        profiles:customer_id(full_name, email),
        order_items(id, product_id, quantity, seller_id:products(seller_id))
      `,
      )
      .eq("status", "pending")
      .lt("created_at", twentyFourHoursAgo)

    if (fetchError) {
      logger.error('Error fetching old pending orders for cleanup', {
        error: fetchError.message,
      })
      throw fetchError
    }

    if (!oldOrders || oldOrders.length === 0) {
      logger.logOrder('cleanup_completed', 'batch', { cleanedCount: 0 })
      return NextResponse.json({ message: "No old pending orders found", cleaned: 0 })
    }

    logger.logOrder('cleanup_found_orders', 'batch', { count: oldOrders.length })

    const cleanedOrders = []
    const notifications = []

    // Process each old order
    for (const order of oldOrders) {
      try {
        // Get unique seller IDs from order items
        const sellerIds = new Set<string>()
        if (order.order_items) {
          for (const item of order.order_items) {
            if (item.seller_id?.[0]?.seller_id) {
              sellerIds.add(item.seller_id[0].seller_id)
            }
          }
        }

        // Delete order items first (due to foreign key constraints)
        const { error: deleteItemsError } = await adminClient
          .from("order_items")
          .delete()
          .eq("order_id", order.id)

        if (deleteItemsError) {
          logger.error('Error deleting order items during cleanup', {
            orderId: order.id,
            error: deleteItemsError.message,
          })
          continue
        }

        // Delete the order
        const { error: deleteOrderError } = await adminClient
          .from("orders")
          .delete()
          .eq("id", order.id)

        if (deleteOrderError) {
          logger.error('Error deleting order during cleanup', {
            orderId: order.id,
            error: deleteOrderError.message,
          })
          continue
        }

        cleanedOrders.push(order.id)
        logger.logOrder('cleanup_deleted', order.id, { customerId: order.customer_id })

        // Create notification for customer
        const customerNotificationData = {
          user_id: order.customer_id,
          title: "Order Expired",
          message: `Your order was automatically cancelled because payment was not completed within 24 hours. Order ID: ${order.id.slice(0, 8)}. Amount: $${order.total_amount}`,
          type: "order_expired_customer",
          order_id: order.id,
        }

        const { error: customerNotifError } = await adminClient
          .from("notifications")
          .insert([customerNotificationData])

        if (customerNotifError) {
          logger.error('Error creating customer cleanup notification', {
            orderId: order.id,
            error: customerNotifError.message,
          })
        }

        // Create notifications for each seller
        for (const sellerId of sellerIds) {
          const sellerNotificationData = {
            user_id: sellerId,
            title: "Order Expired",
            message: `An order from ${order.customer_name} was automatically cancelled due to non-payment. Order ID: ${order.id.slice(0, 8)}`,
            type: "order_expired_seller",
            order_id: order.id,
          }

          const { error: sellerNotifError } = await adminClient
            .from("notifications")
            .insert([sellerNotificationData])

          if (sellerNotifError) {
            logger.error('Error creating seller cleanup notification', {
              orderId: order.id,
              sellerId,
              error: sellerNotifError.message,
            })
          }
        }
      } catch (error) {
        logger.error('Error processing order in cleanup', {
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }
    }

    logger.logOrder('cleanup_completed', 'batch', { 
      cleanedCount: cleanedOrders.length,
      ordersProcessed: oldOrders.length,
    })

    return NextResponse.json({
      message: "Cleanup completed",
      cleaned: cleanedOrders.length,
      notificationsSent: cleanedOrders.length,
      cleanedOrderIds: cleanedOrders,
    })
  } catch (error) {
    logger.error('Error in order cleanup cron', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
