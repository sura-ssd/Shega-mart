import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { Package, Calendar, CreditCard, MapPin } from "lucide-react"
import { ReturnDialog } from "@/components/returns/return-dialog"
import { formatPrice } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

function PurchaseHistoryLoadingSkeleton() {
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
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-24 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function PurchaseHistoryContent() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(preferences.language, key, vars)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: purchases, error } = await supabase.rpc("get_customer_purchase_history", {
    p_customer_id: user.id,
  })

  if (error) {
    console.error("[v0] Error fetching purchase history:", error)
  }

  // Group items by order
  const groupedOrders = purchases?.reduce((acc: any, item: any) => {
    if (!acc[item.order_id]) {
      acc[item.order_id] = {
        order_id: item.order_id,
        order_created_at: item.order_created_at,
        order_total: item.order_total,
        order_status: item.order_status,
        payment_method: item.payment_method,
        shipping_address: item.shipping_address,
        items: [],
      }
    }
    acc[item.order_id].items.push({
      item_id: item.item_id,
      item_quantity: item.item_quantity,
      item_price: item.item_price,
      item_seller_status: item.item_seller_status,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image_url: item.product_image_url,
      variant_size: item.variant_size,
      variant_color: item.variant_color,
      variant_model: item.variant_model,
      variant_image_url: item.variant_image_url,
    })
    return acc
  }, {})

  const ordersArray = groupedOrders ? Object.values(groupedOrders) : []

  return ordersArray && ordersArray.length > 0 ? (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Card */}
      <Card className="animate-fade-in bg-primary/5 border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" />
              <div>
                <p className="text-xl font-bold sm:text-2xl">{ordersArray.length}</p>
                <p className="text-xs text-muted-foreground sm:text-sm">{tr("account.completedOrders")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" />
              <div>
                <p className="text-xl font-bold sm:text-2xl">
                  {ordersArray.reduce((sum: number, order: any) => sum + order.items.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">{tr("account.itemsPurchased")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" />
              <div>
                <p className="break-all text-base font-bold sm:text-2xl">
                  {formatPrice(ordersArray.reduce((sum: number, order: any) => sum + Number(order.order_total), 0))}
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">{tr("account.totalSpent")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {ordersArray.map((order: any, index: number) => (
          <Card key={order.order_id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {tr("account.orderNumber")}{order.order_id.slice(0, 8)}
                </CardTitle>
                <Badge variant="default" className="bg-green-500">
                  {tr("account.completed")}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(order.order_created_at), { addSuffix: true })}
                </div>
                {order.payment_method && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    {order.payment_method}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div key={item.item_id} className="flex min-w-0 gap-3 rounded-lg bg-muted/50 p-2.5 sm:gap-4 sm:p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md sm:h-16 sm:w-16">
                        <Image
                          src={item.variant_image_url || item.product_image_url || "/placeholder.svg"}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium sm:text-base">{item.product_name}</p>
                          {(item.variant_size || item.variant_color || item.variant_model) && (
                            <p className="text-xs text-muted-foreground">
                              {[item.variant_size && `Size: ${item.variant_size}`, item.variant_color && `Color: ${item.variant_color}`, item.variant_model && `Model: ${item.variant_model}`]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">{tr("account.quantityLabel", { count: item.item_quantity })}</p>
                          <Badge variant="outline" className="mt-1">
                            {tr("account.delivered")}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <p className="text-sm font-semibold sm:text-base">{formatPrice(Number(item.item_price) * item.item_quantity)}</p>
                          <ReturnDialog
                            orderId={order.order_id}
                            productId={item.product_id}
                            itemPrice={Number(item.item_price) * item.item_quantity}
                            productName={item.product_name}
                            deliveryDate={new Date(order.order_created_at)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Address */}
                {order.shipping_address && (
                  <div className="flex items-start gap-2 text-sm bg-muted/30 p-3 rounded-lg">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">{tr("account.deliveredTo")}</p>
                      <p>{order.shipping_address}</p>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="border-t pt-3 flex justify-between items-center font-semibold text-lg">
                  <span>{tr("account.orderTotalLabel")}</span>
                  <span className="text-primary">{formatPrice(Number(order.order_total))}</span>
                </div>

                <div className="rounded-lg border border-border/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">{tr("account.deliveryTimeline")}</p>
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {[tr("account.timelinePlaced"), tr("account.timelineProcessing"), tr("account.timelineDelivered")].map((label) => (
                      <p key={label} className="text-[11px] uppercase tracking-[0.08em] text-primary">
                        {label}
                      </p>
                    ))}
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 w-full rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ) : (
    <Card className="animate-fade-in">
      <CardContent className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">{tr("account.noCompletedPurchasesTitle")}</p>
          <p className="text-sm text-muted-foreground">{tr("account.noCompletedPurchasesSubtitle")}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function PurchaseHistoryPage() {
  const preferences = await getServerPlatformPreferences()
  return (
    <div className="container py-5 sm:py-8">
      <div className="mb-5 animate-fade-in sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{translate(preferences.language, "account.purchaseHistoryTitle")}</h1>
        <p className="text-muted-foreground mt-2">{translate(preferences.language, "account.purchaseHistorySubtitle")}</p>
      </div>
      <Suspense fallback={<PurchaseHistoryLoadingSkeleton />}>
        <PurchaseHistoryContent />
      </Suspense>
    </div>
  )
}
