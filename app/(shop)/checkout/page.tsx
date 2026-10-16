"use client"

import type React from "react"

import { useCart } from "@/hooks/use-cart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { createOrderNotifications } from "./checkout-actions"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"
import { getVariantStockQuantity, type PrimaryVariantAttribute } from "@/lib/product-variants"

const PAYMENT_OPTIONS = [
  { id: "chapa", name: "Chapa", description: "Hosted checkout via Chapa" },
]

const CHAPA_CURRENCIES = [
  { value: "ETB", label: "ETB - Ethiopian Birr" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "UGX", label: "UGX - Ugandan Shilling" },
  { value: "DJF", label: "DJF - Djiboutian Franc" },
] as const

async function syncCartToDb(userId: string) {
  // Placeholder function for syncing cart to database
  // Implement actual logic here
}

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState("chapa")
  const [selectedChapaCurrency, setSelectedChapaCurrency] = useState<(typeof CHAPA_CURRENCIES)[number]["value"]>("ETB")
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  })
  const supabase = createClient()
  const { formatAmount, t } = usePlatformPreferences()
  let createdOrderId: string | null = null

  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart")
    }
  }, [items.length, router])

  useEffect(() => {
    const loadCustomerProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, address")
        .eq("id", user.id)
        .single()

      if (!profileData) return

      const fullName = String(profileData.full_name || "").trim()
      const [firstName = "", ...lastNameParts] = fullName.split(/\s+/)
      const lastName = lastNameParts.join(" ")

      setFormValues((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: user.email || prev.email,
        phone: prev.phone || profileData.phone || "",
        address: prev.address || profileData.address || "",
      }))
    }

    loadCustomerProfile()
  }, [supabase])

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const firstName = formValues.firstName
      const lastName = formValues.lastName
      const email = formValues.email
      const address = formValues.address
      const city = formValues.city
      const state = formValues.state
      const zip = formValues.zip
      const phone = formValues.phone

      if (!selectedPayment) {
        toast.error(t("checkout.pleaseSelectBank"))
        setLoading(false)
        return
      }

      const shippingAddress = `${address}, ${city}, ${state} ${zip}`
      const customerName = `${firstName} ${lastName}`

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error(t("checkout.pleaseSignIn"))
        router.push(`/auth/login?next=${encodeURIComponent("/checkout")}`)
        return
      }

      if (user?.id) {
        await syncCartToDb(user.id)
      }

      const productIds = items.map((item) => (item.id || "").split("::")[0])
      const { data: products, error: stockError } = await supabase
        .from("products")
        .select("id, stock, name, seller_id, variant_stock")
        .in("id", productIds)

      if (stockError) {
        console.error("[v0] Stock validation error:", stockError)
        throw new Error("Failed to validate stock availability")
      }

      const stockIssues: string[] = []
      items.forEach((cartItem) => {
        const baseProductId = (cartItem.id || "").split("::")[0]
        const product = products?.find((p) => p.id === baseProductId)
        if (!product) {
          stockIssues.push(t("checkout.noLongerAvailable", { name: cartItem.name }))
        } else {
          const variant = (cartItem as any).variant
          const primaryAttribute: PrimaryVariantAttribute = variant?.model ? "model" : "size"
          const stockMap = product.variant_stock && typeof product.variant_stock === "object"
            ? product.variant_stock as Record<string, number>
            : {}
          const available = getVariantStockQuantity(
            stockMap,
            primaryAttribute,
            variant?.model || variant?.size || null,
            variant?.color || null,
            Number(product.stock),
          )

          if (available < cartItem.quantity) {
            stockIssues.push(t("checkout.onlyAvailableInCart", { name: cartItem.name, available, inCart: cartItem.quantity }))
          }
        }
      })

      if (stockIssues.length > 0) {
        toast.error(t("checkout.stockIssueTitle"), {
          description: stockIssues.join(". "),
        })
        setLoading(false)
        router.push("/cart")
        return
      }

      const orderItems = items.map((item) => {
        const baseProductId = (item.id || "").split("::")[0]
        return {
          product_id: baseProductId,
          quantity: item.quantity,
          price: item.price,
          variant_size: (item as any).variant?.size ?? null,
          variant_color: (item as any).variant?.color ?? null,
          variant_model: (item as any).variant?.model ?? null,
          variant_image_url: (item as any).variant?.image_url ?? item.image_url ?? null,
        }
      })

      const { data: orderId, error: orderError } = await supabase.rpc("create_order", {
        p_customer_id: user.id,
        p_total_amount: getTotalPrice() + 10 + getTotalPrice() * 0.1,
        p_shipping_address: shippingAddress,
        p_customer_name: customerName,
        p_customer_email: email,
        p_customer_phone: phone,
        p_payment_method: selectedPayment,
        p_order_items: orderItems,
      })

      if (orderError) {
        console.error("[v0] Order creation error:", orderError)
        throw orderError
      }

      createdOrderId = orderId
      console.log("[v0] Order ID from RPC:", orderId, "Type:", typeof orderId)

      if (selectedPayment === "chapa") {
        const totalAmount = Number(getTotalPrice() + 10 + getTotalPrice() * 0.1)
        const amountInSmallestUnit = Math.round(totalAmount * 100) // Chapa expects whole number in cents/santim
        const chapaRef = `ORD${String(orderId || "").replace(/-/g, "").slice(0, 12)}`.slice(0, 20)

        const initializeResponse = await fetch("/api/payments/chapa/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: String(orderId),
            merchant_reference: chapaRef,
            amount: amountInSmallestUnit,
            currency: selectedChapaCurrency,
            customer: {
              first_name: firstName,
              last_name: lastName,
              email,
              phone_number: phone,
            },
            return_url: `${window.location.origin}/account/orders?payment=success`,
            callback_url: `${window.location.origin}/api/payments/chapa/webhook`,
          }),
        })

        const initializePayload = await initializeResponse.json()

        if (!initializeResponse.ok || initializePayload?.status !== "success" || !initializePayload?.data?.checkout_url) {
          if (createdOrderId) {
            await supabase
              .from("orders")
              .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
              })
              .eq("id", createdOrderId)
          }

          throw new Error(initializePayload?.message || "Failed to initialize Chapa payment")
        }

        clearCart()
        await supabase.from("cart_items").delete().eq("user_id", user.id)

        try {
          const sellerIds = new Set<string>()

          if (products && Array.isArray(products)) {
            for (const product of products) {
              if (product.seller_id && typeof product.seller_id === "string") {
                sellerIds.add(product.seller_id)
              }
            }
          }

          const notifResult = await createOrderNotifications(
            orderId,
            user.id,
            Array.from(sellerIds),
            customerName,
            getTotalPrice() + 10 + getTotalPrice() * 0.1
          )

          if (!notifResult.ok) {
            console.error("[v0] Failed to create notifications:", notifResult.error || "Unknown error")
          }
        } catch (error) {
          console.error("[v0] Error creating order placed notifications:", error)
        }

        window.location.href = initializePayload.data.checkout_url
        return
      }

      clearCart()

      // Delete cart items from database
      await supabase.from("cart_items").delete().eq("user_id", user.id)

      try {
        const sellerIds = new Set<string>()

        if (products && Array.isArray(products)) {
          for (const product of products) {
            if (product.seller_id && typeof product.seller_id === "string") {
              sellerIds.add(product.seller_id)
            }
          }
        }

        const notifResult = await createOrderNotifications(
          orderId,
          user.id,
          Array.from(sellerIds),
          customerName,
          getTotalPrice() + 10 + getTotalPrice() * 0.1
        )

        if (!notifResult.ok) {
          console.error("[v0] Failed to create notifications:", notifResult.error || "Unknown error")
        }
      } catch (error) {
        console.error("[v0] Error creating order placed notifications:", error)
      }

      toast.success(t("checkout.orderPlacedSuccess"))
      router.push("/account/purchase-history")
    } catch (error) {
      if (selectedPayment === "chapa" && createdOrderId) {
        try {
          await supabase
            .from("orders")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", createdOrderId)
        } catch (rollbackError) {
          console.error("[v0] Failed to cancel Chapa order after checkout error:", rollbackError)
        }
      }

      console.error("[v0] Checkout error:", error)
      toast.error(t("checkout.failedToPlaceOrder"))
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking if cart has items
  if (items.length === 0) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-5 animate-fade-in sm:px-6 sm:py-8 lg:px-8">
      <h1 className="mb-5 text-2xl font-bold tracking-tight animate-slide-up sm:mb-8 sm:text-3xl">{t("checkout.title")}</h1>

      <form onSubmit={handleCheckout}>
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            <Card className="animate-slide-in-left">
              <CardHeader>
                <CardTitle>{t("checkout.shippingInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("checkout.firstName")}</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formValues.firstName}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, firstName: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("checkout.lastName")}</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formValues.lastName}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, lastName: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("checkout.email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formValues.email}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("checkout.phone")}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formValues.phone}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t("checkout.address")}</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formValues.address}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, address: e.target.value }))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("checkout.city")}</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formValues.city}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, city: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">{t("checkout.state")}</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formValues.state}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, state: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">{t("checkout.zip")}</Label>
                    <Input
                      id="zip"
                      name="zip"
                      value={formValues.zip}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, zip: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-slide-in-left">
              <CardHeader>
                <CardTitle>{t("checkout.paymentMethod")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment">Payment method</Label>
                  <Select value={selectedPayment} onValueChange={setSelectedPayment} disabled={loading}>
                    <SelectTrigger id="payment">
                      <SelectValue placeholder="Choose payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_OPTIONS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.description ? `${option.name} — ${option.description}` : option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPayment === "chapa" && (
                  <div className="space-y-2">
                    <Label htmlFor="chapa-currency">Chapa currency</Label>
                    <Select value={selectedChapaCurrency} onValueChange={(value) => setSelectedChapaCurrency(value as (typeof CHAPA_CURRENCIES)[number]["value"])} disabled={loading}>
                      <SelectTrigger id="chapa-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHAPA_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {selectedPayment === "chapa"
                    ? "You will be redirected to Chapa’s secure hosted checkout page to complete payment."
                    : t("checkout.bankRedirectNotice")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="animate-slide-in-right lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>{t("checkout.orderSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm animate-fade-in">
                      <span className="text-muted-foreground">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium">{formatAmount(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("checkout.subtotal")}</span>
                    <span className="font-medium">{formatAmount(getTotalPrice())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("checkout.shipping")}</span>
                    <span className="font-medium">{formatAmount(10)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("checkout.tax")}</span>
                    <span className="font-medium">{formatAmount(getTotalPrice() * 0.1)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">{t("checkout.total")}</span>
                      <span className="text-lg font-bold text-primary sm:text-xl">
                        {formatAmount(getTotalPrice() + 10 + getTotalPrice() * 0.1)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading || !selectedPayment}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("checkout.processingPayment")}
                    </span>
                  ) : (
                    t("checkout.placeOrder")
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
