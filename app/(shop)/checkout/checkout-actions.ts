"use server"

import { headers } from "next/headers"
import { createOrderPlacedNotifications } from "@/lib/notifications/create-notification"

async function getBaseUrl(): Promise<string> {
  const headersList = headers()
  const protocol = (await headersList).get("x-forwarded-proto") || "http"
  const host = (await headersList).get("x-forwarded-host") || (await headersList).get("host") || "localhost:3000"
  return `${protocol}://${host}`
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const baseUrl = await getBaseUrl()
    const response = await fetch(`${baseUrl}/api/orders/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { 
        ok: false, 
        error: data?.error || `API returned status ${response.status}` 
      }
    }
    
    return { ok: true, data }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Server action error updating order status:", errorMsg)
    return { ok: false, error: errorMsg }
  }
}

export async function createOrderNotifications(
  orderId: string,
  customerId: string,
  sellerIds: string[],
  customerName: string,
  orderAmount: number
) {
  try {
    const created = await createOrderPlacedNotifications(
      customerId,
      customerName,
      orderId,
      orderAmount,
      sellerIds,
    )

    if (!created) {
      return {
        ok: false,
        error: "Failed to create notifications",
      }
    }

    return { ok: true, data: { notificationsCreated: sellerIds.length + 1 } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Server action error creating notifications:", errorMsg)
    return { ok: false, error: errorMsg }
  }
}
