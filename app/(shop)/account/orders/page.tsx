import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

function getTimelineFromSellerStatuses(orderItems: any[] | undefined, tr: (key: Parameters<typeof translate>[1]) => string) {
  const steps = [
    { key: "placed", label: tr("account.timelinePlaced") },
    { key: "processing", label: tr("account.timelineProcessing") },
    { key: "delivered", label: tr("account.timelineDelivered") },
  ]

  const sellerStatuses = (orderItems || []).map((item) => String(item?.seller_status || "pending").toLowerCase())

  if (sellerStatuses.length === 0) {
    return { steps, activeIndex: 0 }
  }

  let activeIndex = 0
  if (sellerStatuses.some((status) => status === "processing" || status === "completed")) {
    activeIndex = 1
  }
  if (sellerStatuses.every((status) => status === "completed")) {
    activeIndex = 2
  }

  return { steps, activeIndex }
}

function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-24 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function OrdersContent() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: orders, error } = await supabase.rpc("get_customer_pending_orders", {
    p_customer_id: user.id,
  })

  if (error) {
    console.error("[v0] Error fetching orders:", error)
  }

  return orders && orders.length > 0 ? (
    <div className="space-y-4">
      {orders.map((order: any, index: number) => (
        <Card key={order.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base sm:text-lg">{tr("account.orderNumber")}{order.id.slice(0, 8)}</CardTitle>
              <Badge
                variant={
                  order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"
                }
              >
                {order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {tr("account.placed")} {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="space-y-2">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    {item.variant_image_url && (
                      <img
                        src={item.variant_image_url}
                        alt={item.product_name}
                        className="h-10 w-10 shrink-0 rounded border object-cover sm:h-12 sm:w-12"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="break-words">
                        {item.product_name}
                        {item.variant_size ? ` • Size: ${item.variant_size}` : ""}
                        {item.variant_color ? ` • Color: ${item.variant_color}` : ""}
                        {item.variant_model ? ` • Model: ${item.variant_model}` : ""}
                        {` x ${item.quantity}`}
                      </span>
                      <Badge variant="outline" className="ml-2 text-xs">{item.seller_status || "pending"}</Badge>
                    </div>
                  </div>
                  <span className="shrink-0 font-medium">{formatPrice(Number(item.price) * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>{tr("common.total")}</span>
                <span className="text-primary">{formatPrice(Number(order.total_amount))}</span>
              </div>
              {order.shipping_address && (
                <div className="mt-4 text-sm">
                  <p className="text-muted-foreground">{tr("account.shippingAddress")}</p>
                  <p>{order.shipping_address}</p>
                </div>
              )}

              {(() => {
                const timeline = getTimelineFromSellerStatuses(order.order_items, tr)
                if (timeline.activeIndex < 0) {
                  return <p className="text-xs text-destructive">{tr("account.orderNoLongerActive")}</p>
                }

                return (
                  <div className="mt-3">
                    <div className="mb-2 grid grid-cols-3 gap-2">
                      {timeline.steps.map((step, idx) => (
                        <p
                          key={step.key}
                          className={`text-[11px] uppercase tracking-[0.08em] ${idx <= timeline.activeIndex ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {step.label}
                        </p>
                      ))}
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${((timeline.activeIndex + 1) / timeline.steps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : (
    <Card className="animate-fade-in">
      <CardContent className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-lg font-medium">{tr("account.noPendingOrdersTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {tr("account.noPendingOrdersSubtitle")}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function OrdersPage() {
  const preferences = await getServerPlatformPreferences()
  return (
    <div className="container py-5 sm:py-8">
      <h1 className="mb-5 text-2xl font-bold tracking-tight animate-fade-in sm:mb-8 sm:text-3xl">{translate(preferences.language, "account.orderHistoryTitle")}</h1>
      <Suspense fallback={<OrdersLoadingSkeleton />}>
        <OrdersContent />
      </Suspense>
    </div>
  )
}
