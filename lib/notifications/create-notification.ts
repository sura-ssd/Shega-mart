import { createAdminClient } from "@/lib/supabase/server-admin"
import type { CreateNotificationInput } from "@/lib/schemas/orders"

interface NotificationPayload {
  user_id: string
  title: string
  message: string
  type: string
  order_id?: string
}

export async function createNotification(payload: NotificationPayload) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from("notifications").insert([payload])

    if (error) {
      // Notification creation failed
      return false
    }

    return true
  } catch (error) {
    // Unexpected error during notification creation
    return false
  }
}

function buildNotificationsFromEvent(
  data: CreateNotificationInput,
  actorUserId: string,
): NotificationPayload[] {
  const {
    type,
    orderId,
    sellerIds,
    customerName,
    orderAmount,
    productName,
    reason,
    refundMethod,
    category,
    customerId,
    lowStockValue,
    threshold,
  } = data

  const notifications: NotificationPayload[] = []

  switch (type) {
    case "order_placed":
      notifications.push({
        user_id: customerId || actorUserId,
        title: "Order Placed",
        message: `Your order #${orderId?.slice(0, 8)} has been placed successfully. Total: $${orderAmount?.toFixed(2)}. Please complete payment within 24 hours.`,
        type: "order_placed_customer",
        order_id: orderId,
      })

      if (sellerIds && Array.isArray(sellerIds)) {
        for (const sellerId of sellerIds) {
          notifications.push({
            user_id: sellerId,
            title: "New Order Received",
            message: `You have received a new order from ${customerName}. Order ID: ${orderId?.slice(0, 8)}. Waiting for customer payment.`,
            type: "order_placed_seller",
            order_id: orderId,
          })
        }
      }
      break

    case "order_delivered":
      notifications.push({
        user_id: customerId || actorUserId,
        title: "Order Delivered",
        message: `Your order #${orderId?.slice(0, 8)} has been delivered and marked as completed.${productName ? ` Item: ${productName}.` : ""}`,
        type: "order_delivered_customer",
        order_id: orderId,
      })
      break

    case "return_requested":
      notifications.push({
        user_id: customerId || actorUserId,
        title: "Return Request Submitted",
        message: `Your return request for "${productName}" has been submitted. Reason: ${reason}. The seller will review it shortly.`,
        type: "return_requested",
        order_id: orderId,
      })

      if (sellerIds?.[0]) {
        notifications.push({
          user_id: sellerIds[0],
          title: "Return Request Received",
          message: `A customer has requested a return for "${productName}". Reason: ${reason}. Order ID: ${orderId?.slice(0, 8)}. Please review and respond.`,
          type: "return_requested",
          order_id: orderId,
        })
      }
      break

    case "return_approved":
      notifications.push({
        user_id: customerId || actorUserId,
        title: "Return Approved",
        message: `Your return for "${productName}" has been approved. ${refundMethod ? `Refund will be processed via ${refundMethod}.` : ""}`,
        type: "return_approved",
        order_id: orderId,
      })

      if (sellerIds?.[0]) {
        notifications.push({
          user_id: sellerIds[0],
          title: "Return Approved",
          message: `You approved the return for "${productName}" from order ${orderId?.slice(0, 8)}. Please process the refund.`,
          type: "return_approved",
          order_id: orderId,
        })
      }
      break

    case "return_rejected":
      notifications.push({
        user_id: customerId || actorUserId,
        title: "Return Rejected",
        message: `Your return request for "${productName}" has been rejected. Order ID: ${orderId?.slice(0, 8)}.`,
        type: "return_rejected",
        order_id: orderId,
      })

      if (sellerIds?.[0]) {
        notifications.push({
          user_id: sellerIds[0],
          title: "Return Rejected",
          message: `You rejected the return for "${productName}" from order ${orderId?.slice(0, 8)}.`,
          type: "return_rejected",
          order_id: orderId,
        })
      }
      break

    case "product_created":
      notifications.push({
        user_id: actorUserId,
        title: "Product Created",
        message: `Your product "${productName}" (${category}) has been successfully created and is now available for sale.`,
        type: "product_created",
      })
      break

    case "low_stock_alert":
      if ((lowStockValue ?? 0) <= 0) {
        notifications.push({
          user_id: actorUserId,
          title: "Item Ended",
          message: `"${productName}" is out of stock. Restock this item to continue receiving orders.`,
          type: "low_stock_alert",
        })
        break
      }

      notifications.push({
        user_id: actorUserId,
        title: "Low Stock Alert",
        message: `"${productName}" is running low with ${lowStockValue ?? 0} item(s) left${typeof threshold === "number" ? ` (threshold: ${threshold})` : ""}.`,
        type: "low_stock_alert",
      })
      break

    case "product_moderation_approved":
      notifications.push({
        user_id: actorUserId,
        title: "Product Approved",
        message: `Your product "${productName}" passed moderation and is now visible to customers.`,
        type: "product_moderation_approved",
      })
      break

    case "product_moderation_rejected":
      notifications.push({
        user_id: actorUserId,
        title: "Product Rejected",
        message: `Your product "${productName}" did not pass moderation. Please update the listing and submit again.`,
        type: "product_moderation_rejected",
      })
      break
  }

  return notifications
}

export async function createNotificationsFromEvent(
  data: CreateNotificationInput,
  actorUserId: string,
) {
  try {
    const adminClient = createAdminClient()
    const notifications = buildNotificationsFromEvent(data, actorUserId)

    if (notifications.length === 0) {
      return { success: false, error: "No notifications to create" }
    }

    const { error } = await adminClient.from("notifications").insert(notifications)
    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, count: notifications.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function createOrderPlacedNotifications(
  customerId: string,
  customerName: string,
  orderId: string,
  orderAmount: number,
  sellerIds: string[],
) {
  try {
    const adminClient = createAdminClient()

    const notifications: NotificationPayload[] = [
      {
        user_id: customerId,
        title: "Order Placed",
        message: `Your order #${orderId.slice(0, 8)} has been placed successfully. Total: $${orderAmount.toFixed(2)}. Please complete payment within 24 hours.`,
        type: "order_placed_customer",
        order_id: orderId,
      },
    ]

    // Add notifications for each seller
    for (const sellerId of sellerIds) {
      notifications.push({
        user_id: sellerId,
        title: "New Order Received",
        message: `You have received a new order from ${customerName}. Order ID: ${orderId.slice(0, 8)}. Waiting for customer payment.`,
        type: "order_placed_seller",
        order_id: orderId,
      })
    }

    const { error } = await adminClient.from("notifications").insert(notifications)

    if (error) {
      // Order notifications creation failed
      return false
    }

    return true
  } catch (error) {
    // Unexpected error during order notifications
    return false
  }
}

export async function createReturnRequestedNotification(
  customerId: string,
  sellerId: string,
  orderId: string,
  productName: string,
  reason: string,
) {
  try {
    const adminClient = createAdminClient()

    const notifications: NotificationPayload[] = [
      {
        user_id: customerId,
        title: "Return Request Submitted",
        message: `Your return request for "${productName}" has been submitted. Reason: ${reason}. The seller will review it shortly.`,
        type: "return_requested",
        order_id: orderId,
      },
      {
        user_id: sellerId,
        title: "Return Request Received",
        message: `A customer has requested a return for "${productName}". Reason: ${reason}. Order ID: ${orderId.slice(0, 8)}. Please review and respond.`,
        type: "return_requested",
        order_id: orderId,
      },
    ]

    const { error } = await adminClient.from("notifications").insert(notifications)

    if (error) {
      // Return request notifications creation failed
      return false
    }

    return true
  } catch (error) {
    // Unexpected error during return request notifications
    return false
  }
}

export async function createReturnApprovedNotification(
  customerId: string,
  sellerId: string,
  orderId: string,
  productName: string,
  refundMethod?: string,
) {
  try {
    const adminClient = createAdminClient()

    const notifications: NotificationPayload[] = [
      {
        user_id: customerId,
        title: "Return Approved",
        message: `Your return for "${productName}" has been approved. ${refundMethod ? `Refund will be processed via ${refundMethod}.` : ""}`,
        type: "return_approved",
        order_id: orderId,
      },
      {
        user_id: sellerId,
        title: "Return Approved",
        message: `You approved the return for "${productName}" from order ${orderId.slice(0, 8)}. Please process the refund.`,
        type: "return_approved",
        order_id: orderId,
      },
    ]

    const { error } = await adminClient.from("notifications").insert(notifications)

    if (error) {
      // Return approved notifications creation failed
      return false
    }

    return true
  } catch (error) {
    // Unexpected error during return approved notifications
    return false
  }
}

export async function createReturnRejectedNotification(
  customerId: string,
  sellerId: string,
  orderId: string,
  productName: string,
) {
  try {
    const adminClient = createAdminClient()

    const notifications: NotificationPayload[] = [
      {
        user_id: customerId,
        title: "Return Rejected",
        message: `Your return request for "${productName}" has been rejected. Order ID: ${orderId.slice(0, 8)}.`,
        type: "return_rejected",
        order_id: orderId,
      },
      {
        user_id: sellerId,
        title: "Return Rejected",
        message: `You rejected the return for "${productName}" from order ${orderId.slice(0, 8)}.`,
        type: "return_rejected",
        order_id: orderId,
      },
    ]

    const { error } = await adminClient.from("notifications").insert(notifications)

    if (error) {
      // Return rejected notifications creation failed
      return false
    }

    return true
  } catch (error) {
    // Unexpected error during return rejected notifications
    return false
  }
}

export async function createProductCreatedNotification(
  sellerId: string,
  productName: string,
  category: string,
) {
  try {
    const adminClient = createAdminClient()

    const notification: NotificationPayload = {
      user_id: sellerId,
      title: "Product Created",
      message: `Your product "${productName}" (${category}) has been successfully created and is now available for sale.`,
      type: "product_created",
    }

    const { error } = await adminClient.from("notifications").insert([notification])

    if (error) {
      // Product created notification creation failed
      return false
    }

    return true
  } catch (error) {
    // Unexpected error during product created notification
    return false
  }
}
