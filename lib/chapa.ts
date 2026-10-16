import crypto from "crypto"

export const CHAPA_CURRENCIES = ["ETB", "USD", "UGX", "DJF"] as const
export type ChapaCurrency = (typeof CHAPA_CURRENCIES)[number]

export function getChapaCurrency(currency?: string): ChapaCurrency {
  const normalized = (currency || "ETB").toUpperCase()
  if ((CHAPA_CURRENCIES as readonly string[]).includes(normalized)) {
    return normalized as ChapaCurrency
  }

  return "ETB"
}

export function getChapaConfig() {
  const secretKey = process.env.CHAPA_SECRET_KEY
  const publicKey = process.env.CHAPA_PUBLIC_KEY
  const merchantId = process.env.CHAPA_MERCHANT_ID
  const baseUrl = process.env.CHAPA_BASE_URL || "https://api.chapa.global/v2"

  if (!secretKey) {
    throw new Error("CHAPA_SECRET_KEY is not set")
  }

  if (!publicKey) {
    throw new Error("CHAPA_PUBLIC_KEY is not set")
  }

  if (!merchantId) {
    throw new Error("CHAPA_MERCHANT_ID is not set")
  }

  return {
    secretKey,
    publicKey,
    merchantId,
    baseUrl,
  }
}

export function sanitizeChapaUrl(url?: string): string | undefined {
  if (!url) return undefined

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") {
      return undefined
    }

    return parsed.toString()
  } catch {
    return undefined
  }
}

export function normalizeChapaPreferredPaymentMethods(preferredPaymentMethods?: string[]) {
  if (!preferredPaymentMethods || preferredPaymentMethods.length === 0) {
    return []
  }

  const validMethods = new Set(["card", "bank", "mobile_money"])

  const normalized = preferredPaymentMethods
    .map((method) => String(method).trim().toLowerCase())
    .filter((method) => validMethods.has(method))

  return [...new Set(normalized)]
}

export async function initializeChapaHostedPayment(params: {
  amount: number
  currency: string
  merchant_reference: string
  customer: {
    first_name: string
    last_name: string
    email: string
    phone_number: string
  }
  meta?: Record<string, string | number | boolean | null>
  return_url?: string
  callback_url?: string
  preferred_payment_methods?: string[]
}) {
  const { secretKey, baseUrl } = getChapaConfig()

  const returnUrl = sanitizeChapaUrl(params.return_url)
  const callbackUrl = sanitizeChapaUrl(params.callback_url)
  const preferredPaymentMethods = normalizeChapaPreferredPaymentMethods(params.preferred_payment_methods)

  const response = await fetch(`${baseUrl}/payments/hosted`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Number(params.amount),
      currency: getChapaCurrency(params.currency),
      merchant_reference: params.merchant_reference,
      customer: {
        first_name: params.customer.first_name,
        last_name: params.customer.last_name,
        email: params.customer.email,
        phone_number: params.customer.phone_number,
      },
      ...(params.meta ? { meta: params.meta } : {}),
      ...(returnUrl ? { return_url: returnUrl } : {}),
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      ...(preferredPaymentMethods.length > 0 ? { preferred_payment_methods: preferredPaymentMethods } : {}),
    }),
  })

  const rawText = await response.text()
  let payload: any = {}

  try {
    payload = JSON.parse(rawText)
  } catch {
    payload = { message: rawText }
  }

  if (!response.ok || payload?.status !== "success" || !payload?.data?.checkout_url) {
    const message = payload?.message || "Chapa payment initialization failed"
    throw new Error(message)
  }

  return payload
}

export function mapChapaPaymentStatusToOrderStatus(chapaStatus?: string): "pending" | "processing" | "cancelled" | null {
  const normalized = String(chapaStatus || "").trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (["success", "paid", "payment.success", "complete", "completed"].includes(normalized)) {
    return "processing"
  }

  if (["pending", "incomplete", "payment.incomplete", "payment.pending"].includes(normalized)) {
    return "pending"
  }

  if (["failed", "payment.failed", "cancelled", "payment.cancelled", "auth_needed", "payment.auth_needed", "blocked", "payment.blocked"].includes(normalized)) {
    return "cancelled"
  }

  return null
}

export function resolveChapaOrderIdFromPayload(payload: any): string | null {
  const possibleValues = [
    payload?.data?.meta?.order_id,
    payload?.data?.meta?.orderId,
    payload?.meta?.order_id,
    payload?.meta?.orderId,
    payload?.data?.order_id,
    payload?.data?.merchant_reference,
    payload?.merchant_reference,
    payload?.reference,
  ]

  for (const value of possibleValues) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return null
}

export async function verifyChapaPayment(reference: string) {
  const { secretKey, baseUrl } = getChapaConfig()

  const response = await fetch(`${baseUrl}/payments/${reference}/verify`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  })

  const rawText = await response.text()
  let payload: any = {}

  try {
    payload = JSON.parse(rawText)
  } catch {
    payload = { message: rawText }
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Chapa verification request failed for ${reference}`)
  }

  return payload
}

export function verifyChapaWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) {
    return false
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  const fallbackDigest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64")

  return signature === digest || signature === fallbackDigest
}
