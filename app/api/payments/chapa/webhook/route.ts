import { NextRequest, NextResponse } from "next/server"
import { mapChapaPaymentStatusToOrderStatus, resolveChapaOrderIdFromPayload, verifyChapaWebhookSignature } from "@/lib/chapa"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-chapa-signature")
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json({ status: "error", message: "Webhook secret not configured" }, { status: 500 })
    }

    const isValid = verifyChapaWebhookSignature(rawBody, signature, webhookSecret)

    if (!isValid) {
      return NextResponse.json({ status: "error", message: "Invalid webhook signature" }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const event = payload?.event || payload?.status || payload?.data?.status

    if (!event) {
      return NextResponse.json({ status: "error", message: "Missing event payload" }, { status: 400 })
    }

    const resolvedOrderId = resolveChapaOrderIdFromPayload(payload)
    const mappedOrderStatus = mapChapaPaymentStatusToOrderStatus(
      payload?.data?.status || payload?.status || payload?.event
    )

    if (resolvedOrderId && mappedOrderStatus) {
      const adminClient = createAdminClient()
      const { error: updateError } = await adminClient
        .from("orders")
        .update({
          status: mappedOrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resolvedOrderId)

      if (updateError) {
        console.error("[v0] Failed to update order from Chapa webhook:", updateError)
      }
    }

    return NextResponse.json({
      status: "success",
      message: `Received ${event} event`,
      order_id: resolvedOrderId,
      order_status: mappedOrderStatus,
    })
  } catch (error) {
    return NextResponse.json({ status: "error", message: "Failed to process Chapa webhook" }, { status: 500 })
  }
}
