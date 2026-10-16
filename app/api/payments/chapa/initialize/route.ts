import { NextResponse } from "next/server"
import { initializeChapaHostedPayment, sanitizeChapaUrl } from "@/lib/chapa"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      order_id,
      merchant_reference,
      amount,
      currency,
      customer,
      return_url,
      callback_url,
      preferred_payment_methods,
    } = body || {}

    if (!order_id || !amount || !customer?.email || !customer?.phone_number) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required payment fields: order_id, amount, customer email, and customer phone_number are required.",
        },
        { status: 400 }
      )
    }

    const reference = String(merchant_reference || `ORD${String(order_id).replace(/-/g, "").slice(0, 12)}`).slice(0, 20)

    const safeReturnUrl = sanitizeChapaUrl(return_url)
    const safeCallbackUrl = sanitizeChapaUrl(callback_url)

    const response = await initializeChapaHostedPayment({
      amount: Number(amount),
      currency: currency || "ETB",
      merchant_reference: reference,
      customer: {
        first_name: customer.first_name || "Customer",
        last_name: customer.last_name || "User",
        email: customer.email,
        phone_number: customer.phone_number,
      },
      meta: {
        order_id: String(order_id),
      },
      return_url: safeReturnUrl,
      callback_url: safeCallbackUrl,
      preferred_payment_methods,
    })

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize Chapa payment"
    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 }
    )
  }
}
