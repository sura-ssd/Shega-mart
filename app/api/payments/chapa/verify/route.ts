import { NextRequest, NextResponse } from "next/server"
import { mapChapaPaymentStatusToOrderStatus, resolveChapaOrderIdFromPayload, verifyChapaPayment } from "@/lib/chapa"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get("reference")

  if (!reference) {
    return NextResponse.json(
      {
        status: "error",
        message: "Missing Chapa payment reference.",
      },
      { status: 400 }
    )
  }

  try {
    const verification = await verifyChapaPayment(reference)
    const orderId = resolveChapaOrderIdFromPayload(verification)
    const mappedOrderStatus = mapChapaPaymentStatusToOrderStatus(verification?.data?.status || verification?.status)

    if (orderId && mappedOrderStatus) {
      const adminClient = createAdminClient()
      const { error: updateError } = await adminClient
        .from("orders")
        .update({
          status: mappedOrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (updateError) {
        console.error("[v0] Failed to update order after Chapa verification:", updateError)
      }
    }

    return NextResponse.json({
      ...verification,
      order_id: orderId,
      order_status: mappedOrderStatus,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify Chapa payment"
    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 }
    )
  }
}
